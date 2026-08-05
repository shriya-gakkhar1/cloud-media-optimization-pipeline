import boto3
from config import settings

s3 = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY,
    aws_secret_access_key=settings.AWS_SECRET_KEY,
    region_name=settings.AWS_REGION,
)

try:
    print("Buckets:")
    response = s3.list_buckets()
    for bucket in response["Buckets"]:
        print(bucket["Name"])

    print("\nTrying upload...")

    s3.put_object(
        Bucket=settings.S3_BUCKET,
        Key="test.txt",
        Body=b"Hello MediaFlow"
    )

    print("✅ Upload successful!")

except Exception as e:
    print(e)