import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from celery.result import AsyncResult
from backend.celery.celery_app import celery_app

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)

@router.get("/{task_id}/status")
def get_task_status(task_id: str):
    task_result = AsyncResult(task_id, app=celery_app)
    if task_result.state == 'PENDING':
        response = {
            'state': task_result.state,
            'current': 0,
            'total': 1,
            'status': 'Pending...'
        }
    elif task_result.state == 'PROGRESS':
        response = {
            'state': task_result.state,
            'current': task_result.info.get('current', 0),
            'total': task_result.info.get('total', 1),
            'status': task_result.info.get('status', 'In progress')
        }
    elif task_result.state != 'FAILURE':
        response = {
            'state': task_result.state,
            'current': task_result.info.get('current', task_result.info.get('total', 1)),
            'total': task_result.info.get('total', 1),
            'status': task_result.info.get('status', '')
        }
    else:
        response = {
            'state': task_result.state,
            'current': task_result.info.get('current', task_result.info.get('total', 1)),
            'total': task_result.info.get('total', 1),
            'status': str(task_result.info),
        }
    return response
