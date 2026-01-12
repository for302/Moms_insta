use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum AppError {
    #[error("API 요청 실패: {0}")]
    ApiError(String),

    #[error("파일 저장 실패: {0}")]
    StorageError(String),

    #[error("잘못된 API 제공자: {0}")]
    InvalidProvider(String),

    #[error("설정을 찾을 수 없습니다")]
    SettingsNotFound,

    #[error("이미지 처리 실패: {0}")]
    ImageProcessingError(String),

    #[error("네트워크 오류: {0}")]
    NetworkError(String),

    #[error("직렬화 오류: {0}")]
    SerializationError(String),

    #[error("파일 읽기 오류: {0}")]
    FileReadError(String),

    #[error("파일 쓰기 오류: {0}")]
    FileWriteError(String),
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::NetworkError(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::SerializationError(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::FileReadError(err.to_string())
    }
}
