from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import shutil
import os
from rag_engine import generate_answer, ingest_document
from rag_engine import generate_answer, ingest_document, vector_store

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# accepts question + history
class QueryRequest(BaseModel):
    question: str
    history: List[Dict[str, str]] = []  # Default is empty list


@app.delete("/reset")
def reset_brain():
    global vector_store
    try:
        # Ask Chroma to delete the collection
        vector_store.delete_collection()

        # Re-initialize the DB immediately so it's ready for new files
        vector_store = None
        # (The rag_engine will need to re-init on next request,
        # but for now, the data is gone).

        return {"status": "Brain wiped! Knowledge deleted."}
    except Exception as e:
        return {"status": f"Error wiping brain: {str(e)}"}

@app.post("/chat")
def chat_endpoint(request: QueryRequest):
    response_data = generate_answer(request.question, request.history)

    return {
        "answer": response_data["answer"],
        "sources": response_data["sources"]
    }


@app.post("/upload")
def upload_document(file: UploadFile = File(...)):
    os.makedirs("./data", exist_ok=True)
    file_path = f"./data/{file.filename}"
    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
    result = ingest_document(file_path)
    return {"status": result}