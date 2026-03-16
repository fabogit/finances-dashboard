# Finance Science Service 🧬

This module provides financial forecasting and data processing capabilities using Pandas and Scikit-learn.

## Environment Setup 🛠️

To ensure the IDE correctly recognizes libraries (like `pandas` and `fastapi`) and to avoid runtime errors, follow these steps:

### 1. Standard Virtual Environment (Recommended)

Create and use a dedicated virtual environment:

```bash
# Create the environment
python3 -m venv .venv

# Activate it (Fish shell)
source .venv/bin/activate.fish

# Activate it (Bash/Zsh shell)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Direnv Integration

If you use `direnv`, the project is configured to automatically manage a Python environment via the `.envrc` file. 

To synchronize the `direnv` environment with the latest dependencies:
1. Enter the `backend-science` directory.
2. Run: `pip install -r requirements.txt` (direnv will use its internal environment).

## IDE Configuration (VS Code / Pyright) 💻

The project includes a `pyrightconfig.json` file. This tells the Python Language Server where to find the installed packages.

### Troubleshooting Import Errors
If your IDE still shows "Import could not be resolved":
1. **Select the correct Interpreter**: 
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Type **"Python: Select Interpreter"**.
   - Choose the one located in `./.venv/bin/python` or `./.direnv/python-3.14/bin/python`.
2. **Restart the Language Server**:
   - Sometimes the IDE needs a nudge to reload the environment after a `pip install`.

## Project Structure
- `main.py`: FastAPI entry point and DTO definitions.
- `processor.py`: Data cleaning and transformation logic.
- `forecaster.py`: Statistical analysis and ML forecasting models.
- `rules.py`: Categorization rules for transactions.
- `tests/`: Unit test suite using `pytest`.

## 📚 API Documentation

Once the service is running, you can access the interactive Swagger UI at:
**[http://localhost:8000/docs](http://localhost:8000/docs)** (default)

## Testing 🧪

The module includes a comprehensive unit test suite covering categorization, data cleaning, and forecasting logic.

```bash
# Run all tests
python -m pytest tests/

# Run with coverage (requires pytest-cov)
python -m pytest --cov=. tests/
```

## CI/CD 🤖

This module is integrated into the global GitHub Actions workflow. Every push to `backend-science/**` triggers:
1. **Type Checking**: Static analysis via `pyright`.
2. **Unit Tests**: Full execution of the `pytest` suite.
3. **Build Verification**: Automatic Docker build check to ensure container health.
