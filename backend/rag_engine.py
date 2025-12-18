import os
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    UnstructuredPowerPointLoader,
    UnstructuredExcelLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

# Global variables
vector_store = None
retriever = None
llm = None


def initialize_rag():
    """Initializes the Vector DB and AI Engine."""
    global vector_store, retriever, llm

    print("⏳ Initializing Local AI (Ollama)...")

    # setup embeddings (The Translator)
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    # setup vector DB (The Memory)
    vector_store = Chroma(
        persist_directory="./vector_db",
        embedding_function=embeddings
    )

    # setup retriever
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    # setup LLM (the brain)
    # lightweight model
    llm = ChatOllama(model="llama3.2:3b", temperature=0.7)

    print("AI Ready!")


# initialize immediately (server starts)
initialize_rag()


def generate_answer(question: str, history: list = []):
    """
    Generates an answer using History + RAG + Sources.
    """
    global retriever, llm

    # format history
    chat_history_str = ""
    if history:
        for msg in history[-3:]:
            role = msg['role'].upper()
            content = msg['content']
            chat_history_str += f"{role}: {content}\n"

    # smart prompt template
    template = """
    You are "DocuBot", a helpful AI assistant.

    PREVIOUS CONVERSATION HISTORY:
    {chat_history}

    CONTEXT FROM UPLOADED DOCUMENTS:
    {context}

    CURRENT USER QUESTION:
    {question}

    INSTRUCTIONS:
    1. ANSWER ONLY THE "CURRENT USER QUESTION". Do not re-answer previous parts of the history.
    2. Check the "CONTEXT" first. If the answer is there, use it and cite the source.
    3. If the answer is NOT in the context, use your own General Knowledge to answer directly.
    4. CRITICAL: Do NOT say "No context was provided" or "I am using general knowledge." Just give the answer.
    5. CRITICAL: Do NOT say "Hello" again unless the "CURRENT USER QUESTION" itself is a greeting.
    """

    prompt = ChatPromptTemplate.from_template(template)

    # retrieval chain
    chain = (
        RunnableParallel({
            "context": retriever,
            "question": RunnablePassthrough(),
            "chat_history": lambda x: chat_history_str,
        })
        .assign(answer=prompt | llm | StrOutputParser())
        .pick(["answer", "context"])
    )

    # run the chain
    result = chain.invoke(question)

    # extract sources
    sources = []
    if "context" in result:
        for doc in result["context"]:
            # Get filename and page number if available
            source_name = os.path.basename(doc.metadata.get("source", "Unknown"))
            page_num = doc.metadata.get("page", 0) + 1
            sources.append(f"{source_name} (Page {page_num})")

    #remove duplicates
    sources = list(set(sources))

    return {"answer": result["answer"], "sources": sources}


def ingest_document(file_path):
    global vector_store, retriever

    # select loader based on extension
    file_ext = os.path.splitext(file_path)[1].lower()

    if file_ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif file_ext == ".docx":
        loader = Docx2txtLoader(file_path)
    elif file_ext == ".pptx":
        loader = UnstructuredPowerPointLoader(file_path)
    elif file_ext == ".xlsx":
        loader = UnstructuredExcelLoader(file_path, mode="elements")
    else:
        return f"Error: Unsupported file type {file_ext}"

    try:
        docs = loader.load()

        # split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        # add to DB
        vector_store.add_documents(splits)
        return f"Successfully processed {len(splits)} chunks from {os.path.basename(file_path)}."

    except Exception as e:
        return f"Error reading file: {str(e)}"


def clear_database():
    global vector_store
    if vector_store is None:
        return "Database not initialized."

    try:
        # Get all IDs
        existing_data = vector_store.get()
        ids_to_delete = existing_data['ids']

        if len(ids_to_delete) == 0:
            return "Brain is already empty."

        # delete by ID
        vector_store.delete(ids=ids_to_delete)
        return f"Deleted {len(ids_to_delete)} documents from memory."

    except Exception as e:
        return f"Error clearing memory: {str(e)}"