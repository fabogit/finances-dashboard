import os
import sys

# Add the 'src' directory to PYTHONPATH so tests can import 'modules'
# This resolves ModuleNotFoundError both locally and in CI.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))
