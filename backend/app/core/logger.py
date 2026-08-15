import logging
import sys

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging(level: int = logging.INFO) -> None:
    """Install a handler on the root logger so every module's logs show up.

    Uvicorn only configures its own ``uvicorn.*`` loggers and leaves the root
    logger without a handler. Any logger created via ``logging.getLogger()``
    (or ``logging.getLogger(__name__)``) with no handler of its own propagates
    to the root logger, so without this its records are silently dropped.
    """
    root = logging.getLogger()
    root.setLevel(level)

    if not root.handlers:
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
        root.addHandler(handler)


def setup_logger(name: str = "app") -> logging.Logger:
    """Creates and configures a custom logger instance."""
    logger = logging.getLogger(name)
    
    # Avoid adding multiple handlers if setup_logger is called repeatedly
    if not logger.handlers:
        logger.setLevel(logging.INFO)

        # Output logs to standard error (stdout/stderr)
        handler = logging.StreamHandler(sys.stderr)
        
        # Define clean, scannable log formatting
        formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Prevent double-logging when Uvicorn root logger is active
        logger.propagate = False

    return logger

# Pre-instantiate a default logger for quick imports
logger = setup_logger("app")
