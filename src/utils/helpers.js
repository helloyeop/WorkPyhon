// 각도를 라디안으로 변환
export const toRadians = (degrees) => {
    return degrees * Math.PI / 180;
};

// 라디안을 각도로 변환
export const toDegrees = (radians) => {
    return radians * 180 / Math.PI;
};

// 오류 처리 래퍼
export const errorHandler = async (operation, errorMessage) => {
    try {
        return await operation();
    } catch (error) {
        console.error(`${errorMessage}:`, error);
        throw error;
    }
};

// 직각 기호 생성
export const createRightAngleSymbol = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(4, 12);
    context.lineTo(4, 4);
    context.lineTo(12, 4);
    context.stroke();
    
    return canvas;
};