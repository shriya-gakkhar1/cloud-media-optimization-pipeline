import boto3
from botocore.exceptions import ClientError
from config import settings

s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY,
    aws_secret_access_key=settings.AWS_SECRET_KEY,
    region_name=settings.AWS_REGION,
)


def upload_file(file_obj, filename):
    print("Uploading to:", settings.S3_BUCKET)
    s3_client.upload_fileobj(
        file_obj,
        settings.S3_BUCKET,
        filename,
    )


def download_file(filename):
    response = s3_client.get_object(
        Bucket=settings.S3_BUCKET,
        Key=filename,
    )
    return response["Body"].read()


def upload_processed_file(file_obj, filename):
    s3_client.upload_fileobj(
        file_obj,
        settings.S3_BUCKET,
        filename,
    )


def get_public_url(filename):
    return (
        f"https://{settings.S3_BUCKET}.s3."
        f"{settings.AWS_REGION}.amazonaws.com/{filename}"
    )