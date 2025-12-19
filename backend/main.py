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


# Background Task Wrapper
def process_document_in_background(file_path: str):
    """
    Wraps the ingest_document function so it can run
    after the server replies to the user.
    """
    print(f"🔄 [Background] Starting ingestion for: {file_path}")
    try:
        result = ingest_document(file_path)
        print(f"✅ [Background] Success: {result}")
    except Exception as e:
        print(f"❌ [Background] Error: {e}")


#data models
class QueryRequest(BaseModel):
    question: str
    history: List[Dict[str, str]] = []


#api endpoints

@app.post("/upload")
def upload_document(
        file: UploadFile = File(...),
        background_tasks: BackgroundTasks = None
):
    file_path = f"{UPLOAD_DIR}/{file.filename}"

    # if file exists skip processing
    if os.path.exists(file_path):
        return {
            "status": "File already exists. Using cached version.",
            "filename": file.filename
        }

    #save File
    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)

    #queue the heavy work
    background_tasks.add_task(process_document_in_background, file_path)

    # return instant success
    return {
        "status": "File received. AI is indexing in background.",
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
        #delete the Vector store data
        if vector_store:
            vector_store.delete_collection()
            vector_store = None

        #delete the actual files
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    print(f"Failed to delete {file_path}. Reason: {e}")

        return {"status": "Brain wiped! Knowledge and files deleted."}
    except Exception as e:
        return {"status": f"Error wiping brain: {str(e)}"}