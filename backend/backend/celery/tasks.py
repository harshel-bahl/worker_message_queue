from .celery_app import celery_app
from backend.db import database
from backend.db.database import CompanyCollectionAssociation
from sqlalchemy.exc import IntegrityError
import uuid

@celery_app.task(bind=True)
def modify_companies_in_collection_task(self, collection_id, company_ids, action):
    db = database.SessionLocal()
    try:
        collection_id = uuid.UUID(collection_id)
        total = len(company_ids)
        for i, company_id in enumerate(company_ids):
            if action == "add":
                association = CompanyCollectionAssociation(
                    company_id=company_id, collection_id=collection_id
                )
                db.add(association)
            elif action == "remove":
                db.query(CompanyCollectionAssociation).filter_by(
                    company_id=company_id, collection_id=collection_id
                ).delete()
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
            except Exception as e:
                db.rollback()
                raise e
            
            self.update_state(
                state='PROGRESS',
                meta={'current': i + 1, 'total': total, 'status': 'In progress'}
            )
        return {'current': total, 'total': total, 'status': 'Task completed!'}
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

@celery_app.task(bind=True)
def select_all_task(self, source_collection_id, target_collection_id):
    db = database.SessionLocal()
    try:
        source_collection_id = uuid.UUID(source_collection_id)
        target_collection_id = uuid.UUID(target_collection_id)

        source_associations = db.query(CompanyCollectionAssociation).filter_by(collection_id=source_collection_id).all()
        target_associations = db.query(CompanyCollectionAssociation).filter_by(collection_id=target_collection_id).all()

        target_company_ids = {assoc.company_id for assoc in target_associations}
        total = len(source_associations)
        added_count = 0

        for i, association in enumerate(source_associations):
            if association.company_id not in target_company_ids:
                new_association = CompanyCollectionAssociation(
                    company_id=association.company_id, collection_id=target_collection_id
                )
                db.add(new_association)
                try:
                    db.commit()
                    added_count += 1
                except IntegrityError:
                    db.rollback()
                except Exception as e:
                    db.rollback()
                    raise e

            self.update_state(
                state='PROGRESS',
                meta={'current': i + 1, 'total': total, 'status': 'In progress'}
            )

        return {'current': total, 'total': total, 'status': f'Task completed! {added_count} associations added.'}
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

@celery_app.task(bind=True)
def delete_all_associations_in_collection_task(self, collection_id):
    db = database.SessionLocal()
    try:
        collection_id = uuid.UUID(collection_id)
        associations = db.query(CompanyCollectionAssociation).filter_by(collection_id=collection_id).all()
        total = len(associations)

        for i, association in enumerate(associations):
            db.delete(association)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
            except Exception as e:
                db.rollback()
                raise e

            self.update_state(
                state='PROGRESS',
                meta={'current': i + 1, 'total': total, 'status': 'In progress'}
            )

        return {'current': total, 'total': total, 'status': 'Task completed! All associations deleted.'}
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
