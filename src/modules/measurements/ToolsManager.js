import { DrawingTools } from '../drawing/DrawingTools';
import { MeasurementTools } from './MeasurementTools';

export class ToolsManager {
    constructor(viewer, layerManager) {
        this.viewer = viewer;
        this.layerManager = layerManager;
        this.drawingTools = null;
        this.measurementTools = null;
        this.activeToolType = null; // 'drawing' | 'measurement' | null
    }

    initializeTools() {
        this.drawingTools = new DrawingTools(this.viewer, this.layerManager.currentTileset);
        this.measurementTools = new MeasurementTools(this.viewer, this.layerManager);
    }

    activateDrawingMode() {
        // 다른 도구가 활성화되어 있다면 비활성화
        this.deactivateAllTools();

        // 드로잉 모드 활성화
        if (this.drawingTools) {
            this.drawingTools.toggleDrawingMode();
            if (this.drawingTools.isDrawingMode) {
                this.activeToolType = 'drawing';
                // LayerManager의 클릭 핸들러 임시 저장 및 제거
                if (this.layerManager && this.layerManager.handler) {
                    this.layerManager.handler.destroy();
                    this.layerManager.handler = null;
                }
            }
        }
        return this.drawingTools?.isDrawingMode || false;
    }

    activateMeasurement(mode) {
        // 다른 도구가 활성화되어 있다면 비활성화
        this.deactivateAllTools();

        // 측정 모드 활성화
        if (this.measurementTools) {
            this.measurementTools.setMeasureMode(mode);
            this.activeToolType = 'measurement';
            // LayerManager의 클릭 핸들러는 MeasurementTools 내부에서 관리됨
        }
    }

    deactivateAllTools() {
        // 드로잉 도구 비활성화
        if (this.drawingTools?.isDrawingMode) {
            this.drawingTools.toggleDrawingMode();
        }

        // 측정 도구 비활성화
        if (this.measurementTools?.activeMeasureMode) {
            this.measurementTools.destroy();
        }

        // LayerManager의 클릭 핸들러 복원
        if (this.layerManager && !this.layerManager.handler) {
            this.layerManager.setupLXMAPClickHandler();
        }

        this.activeToolType = null;
    }

    getActiveToolType() {
        return this.activeToolType;
    }

    // Drawing Tools 관련 메서드
    undoClipping() {
        if (this.drawingTools) {
            return this.drawingTools.undoClipping();
        }
        return 0;
    }

    // Measurement Tools 관련 메서드
    clearMeasurements() {
        if (this.measurementTools) {
            this.measurementTools.clearMeasurement();
        }
    }

    dispose() {
        if (this.drawingTools) {
            this.drawingTools.dispose();
        }
        if (this.measurementTools) {
            this.measurementTools.destroy();
        }
        // LayerManager의 클릭 핸들러 복원
        if (this.layerManager && !this.layerManager.handler) {
            this.layerManager.setupLXMAPClickHandler();
        }
        this.activeToolType = null;
    }
}