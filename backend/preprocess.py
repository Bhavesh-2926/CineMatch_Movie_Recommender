import os
import zipfile
import pandas as pd
import numpy as np
import ast
import pickle
import nltk
from nltk.stem.porter import PorterStemmer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Define directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Zip paths (located in parent folder of backend)
MOVIES_ZIP = os.path.join(BASE_DIR, "..", "tmdb_5000_movies.csv.zip")
CREDITS_ZIP = os.path.join(BASE_DIR, "..", "tmdb_5000_credits.csv.zip")

print("Unzipping datasets...")
with zipfile.ZipFile(MOVIES_ZIP, 'r') as zip_ref:
    zip_ref.extractall(DATA_DIR)

with zipfile.ZipFile(CREDITS_ZIP, 'r') as zip_ref:
    zip_ref.extractall(DATA_DIR)

movies_csv = os.path.join(DATA_DIR, "tmdb_5000_movies.csv")
credits_csv = os.path.join(DATA_DIR, "tmdb_5000_credits.csv")

print("Loading CSV files into Pandas...")
movies = pd.read_csv(movies_csv)
credits = pd.read_csv(credits_csv)

print("Merging movies and credits...")
movies = movies.merge(credits, on='title')

# Select relevant columns
movies = movies[['movie_id', 'title', 'overview', 'genres', 'keywords', 'cast', 'crew']]
movies.dropna(inplace=True)

# Helper functions to convert JSON-like strings to list of names
def convert(obj):
    L = []
    try:
        for i in ast.literal_eval(obj):
            L.append(i['name'])
    except Exception:
        pass
    return L

def convert3(obj):
    L = []
    counter = 0
    try:
        for i in ast.literal_eval(obj):
            if counter != 3:
                L.append(i['name'])
                counter += 1
            else:
                break
    except Exception:
        pass
    return L

def fetch_director(obj):
    L = []
    try:
        for i in ast.literal_eval(obj):
            if i['job'] == 'Director':
                L.append(i['name'])
                break
    except Exception:
        pass
    return L

print("Preprocessing and cleaning data...")
movies['genres'] = movies['genres'].apply(convert)
movies['keywords'] = movies['keywords'].apply(convert)
movies['cast'] = movies['cast'].apply(convert3)
movies['crew'] = movies['crew'].apply(fetch_director)

# Save original overview before split/processing for display in UI
# We want to display original overview, cast, crew, genres in the UI.
# So let's store them in clean formats in the final df.
original_movies_info = movies.copy()

movies['overview'] = movies['overview'].apply(lambda x: x.split())

# Remove spaces to make entities distinct (e.g., "Sam Worthington" -> "SamWorthington")
movies['genres'] = movies['genres'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['keywords'] = movies['keywords'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['cast'] = movies['cast'].apply(lambda x: [i.replace(" ", "") for i in x])
movies['crew'] = movies['crew'].apply(lambda x: [i.replace(" ", "") for i in x])

# Combine into tags
movies['tags'] = movies['overview'] + movies['genres'] + movies['keywords'] + movies['cast'] + movies['crew']

# Prepare final DataFrame
new_df = movies[['movie_id', 'title', 'tags']].copy()
new_df['tags'] = new_df['tags'].apply(lambda x: " ".join(x))
new_df['tags'] = new_df['tags'].apply(lambda x: x.lower())

# Perform Porter Stemming
print("Stemming tags with NLTK PorterStemmer...")
ps = PorterStemmer()

def stem(text):
    y = []
    for i in text.split():
        y.append(ps.stem(i))
    return " ".join(y)

new_df['tags'] = new_df['tags'].apply(stem)

# Compute Cosine Similarity
print("Computing similarity matrix...")
cv = CountVectorizer(max_features=5000, stop_words='english')
vectors = cv.fit_transform(new_df['tags']).toarray()
similarity = cosine_similarity(vectors)

# Convert similarity to float32 to reduce size by half while retaining precision
similarity = similarity.astype(np.float32)

# Keep the original descriptive fields in movies metadata dataframe for rich UI output
# We want: movie_id, title, overview, genres, cast, crew (director)
# Let's clean the lists in original_movies_info for serialization
original_movies_info['genres'] = original_movies_info['genres'].apply(lambda x: [i for i in x])
original_movies_info['cast'] = original_movies_info['cast'].apply(lambda x: [i for i in x])
original_movies_info['director'] = original_movies_info['crew'].apply(lambda x: x[0] if len(x) > 0 else "")

movies_metadata = original_movies_info[['movie_id', 'title', 'overview', 'genres', 'cast', 'director']].copy()

print(f"Movies count: {len(movies_metadata)}")

# Save to pickle files
movies_dict_path = os.path.join(PROCESSED_DIR, "movies_dict.pkl")
similarity_path = os.path.join(PROCESSED_DIR, "similarity.pkl")

print(f"Saving movie dictionary to {movies_dict_path}...")
with open(movies_dict_path, "wb") as f:
    pickle.dump(movies_metadata.to_dict(orient="records"), f)

print(f"Saving similarity matrix to {similarity_path}...")
with open(similarity_path, "wb") as f:
    pickle.dump(similarity, f)

print("Preprocessing successfully completed!")
