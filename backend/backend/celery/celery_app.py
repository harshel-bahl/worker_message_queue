from celery import Celery

celery_app = Celery(
    'tasks',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/0'
)

celery_app.conf.update(
    result_expires=3600,
    broker_connection_retry_on_startup=True,
)

celery_app.autodiscover_tasks(['backend.celery.tasks'])