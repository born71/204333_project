# might need to update uv in this dockerfile
FROM python:3.13.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir "fastapi[standard]>=0.126.0" "uvicorn[standard]>=0.23.2"
COPY ./app /app/app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
