import logging

import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

logger = logging.getLogger(__name__)


_s3_client = None


def _get_s3():
    global _s3_client
    if _s3_client is None:
        logger.info(
            "Initializing S3 client (region=%s, bucket=%s, credentials=%s)",
            settings.AWS_REGION,
            settings.S3_BUCKET_NAME,
            "present" if settings.AWS_ACCESS_KEY_ID else "MISSING",
        )
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
            region_name=settings.AWS_REGION,
        )
    return _s3_client


def upload_file(local_path: str, s3_key: str, content_type: str) -> str:
    logger.info(
        "S3 upload starting: %s -> s3://%s/%s (content_type=%s)",
        local_path,
        settings.S3_BUCKET_NAME,
        s3_key,
        content_type,
    )
    try:
        _get_s3().upload_file(
            local_path,
            settings.S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={
                "ContentType": content_type,
                "ServerSideEncryption": "AES256",
            },
        )
        logger.info("S3 upload complete: s3://%s/%s", settings.S3_BUCKET_NAME, s3_key)
    except ClientError:
        logger.exception("S3 upload FAILED: s3://%s/%s", settings.S3_BUCKET_NAME, s3_key)
        raise
    return s3_key


def generate_presigned_url(s3_key: str, expiry: int = 3600) -> str:
    url = _get_s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=expiry,
    )
    logger.info("Generated presigned URL for s3://%s/%s (expires in %ss)", settings.S3_BUCKET_NAME, s3_key, expiry)
    return url


def delete_file(s3_key: str) -> None:
    try:
        _get_s3().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        logger.info("Deleted s3://%s/%s", settings.S3_BUCKET_NAME, s3_key)
    except ClientError:
        logger.exception("S3 delete FAILED: s3://%s/%s", settings.S3_BUCKET_NAME, s3_key)
