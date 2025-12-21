# Copyright 2025 [Ravindu Kaveesha]
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0

import os
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, UnstructuredPowerPointLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# for chains
from langchain.chains import create_history_aware_retriever
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

# configuration
DB_DIR = "chroma_db"

# embeddings
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# init vector store
vector_store = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
retriever = vector_store.as_retriever()

# init LLM
llm = ChatOllama(model="llama3.2:3b", temperature=0)


def ingest_document(file_path: str):
    try:
        filename = os.path.basename(file_path)
        if file_path.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith(".docx"):
            loader = Docx2txtLoader(file_path)
        elif file_path.endswith(".pptx"):
            loader = UnstructuredPowerPointLoader(file_path)
        else:
            return f"Unsupported file type: {filename}"

        docs = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)
        vector_store.add_documents(splits)
        return f"Successfully ingested {filename}"
    except Exception as e:
        return f"Error ingesting document: {str(e)}"


def generate_answer(question: str, history: list = []):
    # Rag pipline setup
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )

    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        ("system", contextualize_q_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])

    history_chain = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

    # prompt
    qa_system_prompt = (
        "You are a helpful and concise assistant. Use the following pieces of retrieved context to answer the question. "
        "\n\n"
        "RULES FOR ANSWERING:\n"
        "1. **Be Concise**: Keep your answer under 5 sentences if possible.\n"
        "2. **Use Structure**: Use bullet points for lists to make it readable.\n"
        "3. **Directness**: Get straight to the point. Do not start with 'According to the documents...'.\n"
        "4. **Relevance**: Only answer what is asked. Do not add extra unnecessary details.\n"
        "5. **No Context Check**: If the context is COMPLETELY UNRELATED to the question (e.g. user asks about 'Richest Countries' but context is about 'Java Code'), "
        "start your response with the exact tag: [NO_CONTEXT] followed by a general answer.\n"
        "\n"
        "Context:\n"
        "{context}"
    )

    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", qa_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])

    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_chain, question_answer_chain)

    # RAG run
    response = rag_chain.invoke({
        "input": question,
        "chat_history": history
    })

    answer_text = response["answer"]

    clean_sources = []

    if "[NO_CONTEXT]" in answer_text:
        answer_text = answer_text.replace("[NO_CONTEXT]", "").strip()
        clean_sources = []

    elif question.strip().lower() in ["hi", "hello", "hey", "thanks", "thank you"]:
        clean_sources = []

    else:
        # extract page numbers
        unique_sources = set()
        for doc in response["context"]:
            src = doc.metadata.get("source", "Unknown")
            file_name = os.path.basename(src)
            page_num = doc.metadata.get("page", 0) + 1
            source_entry = f"{file_name} (Page {page_num})"
            unique_sources.add(source_entry)
        clean_sources = list(unique_sources)

    # chat fix
    if not answer_text:
        answer_text = "I couldn't find specific information about that in your documents, and I don't have a general answer right now."

    return {
        "answer": answer_text,
        "sources": clean_sources
    }
