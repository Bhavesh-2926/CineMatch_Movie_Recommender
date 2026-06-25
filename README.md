# 🎬 CineMatch | AI Movie Recommender System

CineMatch is a premium fullstack movie recommender web application built with a **Python FastAPI** backend and a **React TypeScript** frontend. 

It implements a content-based recommendation engine using text embedding and cosine similarity, and features a hybrid architecture that dynamically switches between **Offline Machine Learning Mode** (using pre-trained local data) and **Live TMDB Mode** (fetching real-time recommendations for movies from 1980 to 2026).

---

## ✨ Features

- **Centered Search Interface**: A clean, distraction-free landing page with a search bar centered in the middle of the screen.
- **Search Auto-Suggestions**: Real-time autocomplete suggestions as you type.
- **Fuzzy Input Matching**: Automatically falls back to the closest matching autocomplete suggestion if the search title contains minor typos.
- **Hybrid Recommendation Architecture**:
  - **Live Mode (Active with TMDB API Key)**: Query TMDB's live database for any movie released between **1980 and 2026**, receiving official cover art and real-time recommendations.
  - **Local ML Mode (Fallback)**: Leverages a local machine learning pipeline using Python's CountVectorizer and PorterStemmer on a 4,800-movie Kaggle dataset (pre-2017).
- **Premium Aesthetics**: High-end cinema dark-theme interface built with Vanilla CSS glassmorphic card designs, loading skeleton loaders, and smooth micro-animations.

---

## 🛠️ Tech Stack

### Backend
- **Python**: Core programming language.
- **FastAPI**: Modern, asynchronous web framework for serving recommendation APIs.
- **Pandas & NumPy**: Data cleaning, column parsing, and metadata manipulation.
- **Scikit-Learn**: Vectorizing movie tags with `CountVectorizer` and computing the `cosine_similarity` matrix.
- **NLTK (Natural Language Toolkit)**: Stemming tags with `PorterStemmer` to improve keyword matching.
- **Uvicorn**: Lightweight ASGI web server.

### Frontend
- **React**: Single Page Application (SPA) library.
- **TypeScript**: Static typing for robust frontend components.
- **Vite**: Ultra-fast build tool and bundler.
- **Vanilla CSS**: Curated custom styling (light red, light green, black color palette) without bulky frameworks.
- **Lucide React**: Premium icon assets.

### Version Control & Deployment
- **Git**: Code versioning.
- **Vercel**: Recommended platform for hosting the frontend application.
- **Render**: Recommended hosting solutions for the Python FastAPI backend.

---

## 📂 Project Structure

```text
Movie_Recommender_System/
│
├── backend/
│   ├── processed/             # Precomputed pickle data
│   │   ├── movies_dict.pkl    # Serialized movie metadata dict
│   │   └── similarity.pkl     # Pre-calculated float32 similarity matrix
│   ├── main.py                # FastAPI server (API endpoints)
│   ├── preprocess.py          # ML cleaning, stemming, and model pickles generator
│   └── requirements.txt       # Python backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── MovieCard.tsx  # Dynamic grid/hero card with TMDB poster fetching
│   │   ├── App.tsx            # Main layout, search logic, keyboard navigation
│   │   ├── index.css          # Custom Vanilla CSS animations, grids, colors
│   │   └── main.tsx           # React mounting script
│   ├── index.html             # SEO optimized template page
│   ├── package.json           # Node project dependencies
│   └── vite.config.ts         # Vite bundler configurations
│
├── tmdb_5000_movies.csv.zip   # Raw dataset zip file
├── tmdb_5000_credits.csv.zip  # Raw dataset zip file
└── README.md                  # This file
```

---

## 🚀 Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

---

### Step 1: Run the Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the data preprocessing script (this extracts datasets, runs the ML pipeline, and generates the pickles):
   ```bash
   python preprocess.py
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will be running at `http://127.0.0.1:8000`.*

---

### Step 2: Run the Frontend

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Open your browser and navigate to **`http://localhost:5173/`**.*

---

## 🔌 API Endpoints

The backend FastAPI service exposes the following API routes:

### 1. Get All Movies
- **Route**: `GET /api/movies`
- **Description**: Returns ID and title for all movies in the dataset. Used by the search suggestion dropdown.
- **Response**:
  ```json
  [
    {"id": 19995, "title": "Avatar"},
    {"id": 285, "title": "Pirates of the Caribbean: At World's End"}
  ]
  ```

### 2. Get Recommendations
- **Route**: `POST /api/recommend`
- **Description**: Accepts a movie title or ID, performs cosine similarity lookup, and returns the selected movie details along with 5 matching titles.
- **Request Body**:
  ```json
  {
    "movie_title": "Avatar"
  }
  ```
- **Response**:
  ```json
  {
    "selected_movie": {
      "id": 19995,
      "title": "Avatar",
      "overview": "In the 22nd century, a paraplegic Marine...",
      "genres": ["Action", "Adventure", "Fantasy", "ScienceFiction"],
      "cast": ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver"],
      "director": "James Cameron"
    },
    "recommendations": [
      {"id": 440, "title": "Aliens vs Predator: Requiem", "overview": "...", "genres": [...], "cast": [...], "director": "..."},
      {"id": 185, "title": "Aliens", "overview": "...", "genres": [...], "cast": [...], "director": "..."}
    ]
  }
  ```

---

## 🌐 Production Deployment

### Frontend on Vercel
1. Install the Vercel CLI or connect your Git repository to [Vercel](https://vercel.com).
2. Configure your project build settings on Vercel:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Click **Deploy**.

### Backend Hosting
- Deploy the `backend/` folder to platforms like **Render**, **Railway**, or **PythonAnywhere**.
- Ensure to configure the backend URL in the React frontend's API calls inside [App.tsx](file:///c:/Users/xyzabc/Downloads/Movie_Recommender_System-main/Movie_Recommender_System-main/frontend/src/App.tsx) when deploying.

---

## 📄 License

This project is licensed under the MIT License.