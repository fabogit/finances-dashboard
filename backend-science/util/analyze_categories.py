import pandas as pd
import sys

def extract_unique_categories(file_path):
    try:
        df = pd.read_excel(file_path)

        cat_col = next((c for c in df.columns if 'Categoria ' in c), None)

        if cat_col:
            unique_cats = df[cat_col].dropna().unique()
            print("\n--- ELENCO CATEGORIE TROVATE ---")
            for cat in sorted(unique_cats):
                print(f'"{cat}",')
            print("--------------------------------\n")
        else:
            print("Colonna 'Categoria' non trovata.")

    except Exception as e:
        print(f"Errore: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_unique_categories(sys.argv[1])
    else:
        print("Uso: python analyze_categories.py <path_to_excel>")