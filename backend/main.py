# Copyright 2025 [Ravindu Kaveesha]
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0

import os
import shutil
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict

# import existing logic
from rag_engine import generate_answer, ingest_document, vector_store

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# configuration
UPLOAD_DIR = "./data"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# background task wrapper
def process_document_in_background(file_path: str):
    """
    Feeds the document to the AI.
    This runs in the background so the UI doesn't freeze.
    """
    print(f"🔄 [Background] Processing file: {file_path}")
    try:
        result = ingest_document(file_path)
        print(f"✅ [Background] Success: {result}")
    except Exception as e:
        print(f"❌ [Background] Error: {e}")


# data models
class QueryRequest(BaseModel):
    question: str
    history: List[Dict[str, str]] = []


# API endpoints

@app.post("/upload")
def upload_document(
        file: UploadFile = File(...),
        background_tasks: BackgroundTasks = None
):
    file_path = f"{UPLOAD_DIR}/{file.filename}"

    # logic states

    # check the file on the server
    if os.path.exists(file_path):
        # prevent re upload
        status_message = "File found in cache. Loading into AI memory immediately."
        print(f"📂 File {file.filename} already exists. Skipping upload.")

        background_tasks.add_task(process_document_in_background, file_path)

    else:
        # new file save
        status_message = "File uploaded and processing started."
        print(f"📥 New file received: {file.filename}")

        with open(file_path, "wb+") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # feed it to the AI
        background_tasks.add_task(process_document_in_background, file_path)

    return {
        "status": status_message,
        "filename": file.filename
    }


@app.post("/chat")
def chat_endpoint(request: QueryRequest):
    response_data = generate_answer(request.question, request.history)
    return {
        "answer": response_data["answer"],
        "sources": response_data["sources"]
    }


@app.delete("/reset")
def reset_brain():
    global vector_store
    try:
        # wipe AI memory
        if vector_store:
            vector_store.delete_collection()

        return {"status": "AI Memory wiped. Files remain in storage for fast re-loading."}
    except Exception as e:
        return {"status": f"Error wiping brain: {str(e)}"}
