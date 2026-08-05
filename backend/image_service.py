from PIL import Image
import io
import time


def optimize_image(raw_bytes):

    start = time.time()

    img = Image.open(io.BytesIO(raw_bytes))

    max_width = 800

    if img.width > max_width:

        ratio = max_width / img.width

        new_height = int(img.height * ratio)

        img = img.resize(
            (max_width, new_height),
            Image.Resampling.LANCZOS,
        )

    original_size = len(raw_bytes)

    output = io.BytesIO()

    img.convert("RGB").save(
        output,
        format="JPEG",
        quality=85,
        optimize=True,
    )

    output.seek(0)

    optimized_size = len(output.getvalue())

    processing_time = round(
        (time.time() - start) * 1000,
        2,
    )

    compression = round(
        (
            (original_size - optimized_size)
            / original_size
        ) * 100,
        2,
    )

    return output, {
        "processing_time_ms": processing_time,
        "original_size": original_size,
        "optimized_size": optimized_size,
        "compression_percentage": compression,
    }