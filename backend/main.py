import os
import pickle
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Load data files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
MOVIES_DICT_PATH = os.path.join(PROCESSED_DIR, "movies_dict.pkl")
SIMILARITY_PATH = os.path.join(PROCESSED_DIR, "similarity.pkl")

if not os.path.exists(MOVIES_DICT_PATH) or not os.path.exists(SIMILARITY_PATH):
    raise RuntimeError("Processed data files not found. Please run preprocess.py first.")

print("Loading movies metadata...")
with open(MOVIES_DICT_PATH, "rb") as f:
    movies_list = pickle.load(f)  # List of dicts

print("Loading similarity matrix...")
with open(SIMILARITY_PATH, "rb") as f:
    similarity = pickle.load(f)

# Helper mappings for fast lookup
# mapping from movie_id -> index, title -> index
id_to_idx = {movie["movie_id"]: i for i, movie in enumerate(movies_list)}
title_to_idx = {movie["title"].lower().strip(): i for i, movie in enumerate(movies_list)}

app = FastAPI(title="Movie Recommender System API")

# Add CORS Middleware to allow React frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecommendationRequest(BaseModel):
    movie_id: Optional[int] = None
    movie_title: Optional[str] = None

class MovieDetail(BaseModel):
    id: int
    title: str
    overview: str
    genres: List[str]
    cast: List[str]
    director: str

class RecommendationResponse(BaseModel):
    selected_movie: MovieDetail
    recommendations: List[MovieDetail]

@app.get("/api/movies")
def get_movies():
    """
    Returns a list of all movies in the dataset.
    Used by the frontend to populate search suggestions.
    """
    return [{"id": movie["movie_id"], "title": movie["title"]} for movie in movies_list]

@app.post("/api/recommend", response_model=RecommendationResponse)
def recommend_movies(req: RecommendationRequest):
    """
    Finds the top 5 recommended movies based on similarity.
    Can search by either movie_id or movie_title.
    """
    idx = None
    
    if req.movie_id is not None:
        idx = id_to_idx.get(req.movie_id)
        if idx is None:
            raise HTTPException(status_code=404, detail="Movie ID not found")
            
    elif req.movie_title is not None:
        clean_title = req.movie_title.lower().strip()
        idx = title_to_idx.get(clean_title)
        if idx is None:
            raise HTTPException(status_code=404, detail="Movie title not found")
            
    else:
        raise HTTPException(status_code=400, detail="Please provide either movie_id or movie_title")

    # Get selected movie details
    sel_movie_data = movies_list[idx]
    selected_movie = MovieDetail(
        id=sel_movie_data["movie_id"],
        title=sel_movie_data["title"],
        overview=sel_movie_data["overview"],
        genres=sel_movie_data["genres"],
        cast=sel_movie_data["cast"],
        director=sel_movie_data["director"]
    )
    
    # Calculate similarity distances
    distances = similarity[idx]
    
    # Sort and get top 5 recommended movies (excluding the movie itself at position 0)
    # Each entry in movies_list has: (index, similarity_score)
    sim_scores = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
    
    # Find top 5 recommendations excluding the selected movie
    recs = []
    for i, score in sim_scores:
        if i == idx:
            continue
        
        rec_movie_data = movies_list[i]
        recs.append(MovieDetail(
            id=rec_movie_data["movie_id"],
            title=rec_movie_data["title"],
            overview=rec_movie_data["overview"],
            genres=rec_movie_data["genres"],
            cast=rec_movie_data["cast"],
            director=rec_movie_data["director"]
        ))
        if len(recs) == 5:
            break
            
    return RecommendationResponse(
        selected_movie=selected_movie,
        recommendations=recs
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
