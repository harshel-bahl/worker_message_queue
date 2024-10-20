import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.celery.tasks import modify_companies_in_collection_task, select_all_task, delete_all_associations_in_collection_task

from backend.db import database
from backend.routes.companies import (
    CompanyBatchOutput,
    fetch_companies_with_liked,
)

router = APIRouter(
    prefix="/collections",
    tags=["collections"],
)


class CompanyCollectionMetadata(BaseModel):
    id: uuid.UUID
    collection_name: str


class CompanyCollectionOutput(CompanyBatchOutput, CompanyCollectionMetadata):
    pass


@router.get("", response_model=list[CompanyCollectionMetadata])
def get_all_collection_metadata(
    db: Session = Depends(database.get_db),
):
    collections = db.query(database.CompanyCollection).all()

    return [
        CompanyCollectionMetadata(
            id=collection.id,
            collection_name=collection.collection_name,
        )
        for collection in collections
    ]


@router.get("/{collection_id}", response_model=CompanyCollectionOutput)
def get_company_collection_by_id(
    collection_id: uuid.UUID,
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    db: Session = Depends(database.get_db),
):
    query = (
        db.query(database.CompanyCollectionAssociation, database.Company)
        .join(database.Company)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
    )

    total_count = query.with_entities(func.count()).scalar()

    results = query.offset(offset).limit(limit).all()
    companies = fetch_companies_with_liked(db, [company.id for _, company in results])

    return CompanyCollectionOutput(
        id=collection_id,
        collection_name=db.query(database.CompanyCollection)
        .get(collection_id)
        .collection_name,
        companies=companies,
        total=total_count,
    )

class ModifyCompaniesRequest(BaseModel):
    company_ids: List[int]
    action: str 

@router.post("/{collection_id}/modify_companies")
def modify_companies_in_collection(
    collection_id: uuid.UUID,
    request: ModifyCompaniesRequest,
    db: Session = Depends(database.get_db),
):
    if not request.company_ids:
        raise HTTPException(status_code=400, detail="No company IDs provided.")
    if request.action not in ["add", "remove"]:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'add' or 'remove'.")

    total_companies = len(request.company_ids)

    # Define a threshold for synchronous vs. asynchronous processing
    THRESHOLD = 5

    if total_companies <= THRESHOLD:
        for company_id in request.company_ids:
            if request.action == "add":
                association = database.CompanyCollectionAssociation(
                    company_id=company_id, collection_id=collection_id
                )
                db.add(association)
            elif request.action == "remove":
                db.query(database.CompanyCollectionAssociation).filter_by(
                    company_id=company_id, collection_id=collection_id
                ).delete()
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                continue
        return {"status": "completed"}
    else:
        task = modify_companies_in_collection_task.apply_async(args=[str(collection_id), request.company_ids, request.action])
        return {"status": "in_progress", "task_id": task.id}

@router.post("/{source_collection_id}/select_all/{target_collection_id}")
def select_all_companies(
    source_collection_id: uuid.UUID,
    target_collection_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    task = select_all_task.apply_async(args=[str(source_collection_id), str(target_collection_id)])
    return {"status": "in_progress", "task_id": task.id}

@router.delete("/{collection_id}/delete_all_associations")
def delete_all_associations_in_collection(
    collection_id: uuid.UUID,
    db: Session = Depends(database.get_db),
):
    task = delete_all_associations_in_collection_task.apply_async(args=[str(collection_id)])
    return {"status": "in_progress", "task_id": task.id}
