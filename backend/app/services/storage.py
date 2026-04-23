import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import mimetypes


s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
)


def upload_file(local_path: str, s3_key: str, content_type: str) -> str:
    s3_client.upload_file(
        local_path,
        settings.S3_BUCKET_NAME,
        s3_key,
        ExtraArgs={
            "ContentType": content_type,
            "ServerSideEncryption": "AES256",
        },
    )
    return s3_key


def generate_presigned_url(s3_key: str, expiry: int = 3600) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
        ExpiresIn=expiry,
    )


def delete_file(s3_key: str) -> None:
    try:
        s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
    except ClientError:
        pass
