import { initializeCesium } from './config/cesiumConfig';
import { LayerManager } from './modules/layers/LayerManager';
import { ToolsManager } from './modules/measurements/ToolsManager';

class App {
    constructor() {
        this.viewer = null;
        this.layerManager = null;
        this.toolsManager = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Cesium 뷰어 초기화
            this.viewer = initializeCesium('cesiumContainer');

            // 레이어 관리자 초기화
            this.layerManager = new LayerManager(this.viewer);
            
            // 데이터 로드
            await this.loadDataProgressively();

            // 도구 관리자 초기화
            this.toolsManager = new ToolsManager(this.viewer, this.layerManager);
            this.toolsManager.initializeTools();
            
            // 메모리 사용량 모니터링
            this.setupMemoryMonitoring();

            // UI 이벤트 핸들러 설정
            this.setupUIEventHandlers();

        } catch (error) {
            console.error('초기화 실패:', error);
            alert('애플리케이션 초기화 중 오류가 발생했습니다.');
        }
    }

    async loadDataProgressively() {
        const loadQueue = [
            () => this.layerManager.loadTileset(),
            //() => this.layerManager.loadModel(),
            () => this.layerManager.loadLXMAP_LINE(),
            () => this.layerManager.loadLXMAP(),
            () => this.layerManager.loadGeoJSON(),
            () => this.layerManager.loadBusstation(),
            () => this.layerManager.loadhospital(),
            () => this.layerManager.loadpharmacy(),
            () => this.layerManager.loadconvenior(),
            () => this.layerManager.loadstandard_building(),
            () => this.layerManager.loadstandard_land(),
            () => this.layerManager.loadcarrot(),
            () => this.layerManager.loadapt(),


            //() => this.layerManager.load_jeju_100000(),
            
            

            
        ];

        for (const loadTask of loadQueue) {
            try {
                await loadTask();
                await this.waitForMemoryStabilization();
            } catch (error) {
                console.error('데이터 로드 실패:', error);
            }
        }
        this.updateLayerPanel();
    }

    async waitForMemoryStabilization() {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setupMemoryMonitoring() {
        if (window.performance && window.performance.memory) {
            
    setInterval(() => {
        if (this.layerManager?.getCurrentTileset()) {
            const tileset = this.layerManager.getCurrentTileset();
            const stats = tileset.statistics;
            console.log({
                'JS 힙 메모리(MB)': Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
                '로드된 타일 수': stats.numberOfTilesWithContentReady,
                '처리 중인 타일': stats.numberOfTilesProcessing,
                '대기 중인 타일': stats.numberOfPendingRequests,
                '총 메모리 사용량(MB)': Math.round(tileset.maximumMemoryUsage)
            });
        }
    }, 10000);
        }
    }
    
    

    setupUIEventHandlers() {
        // 그리기 모드 버튼
        const drawingButton = document.querySelector('button[data-mode="drawing"]');
        if (drawingButton) {
            drawingButton.addEventListener('click', () => {
                const isDrawing = this.toolsManager.activateDrawingMode();
                drawingButton.classList.toggle('active', isDrawing);
                document.getElementById('drawingStatus').innerHTML = 
                    isDrawing ? "그리기 모드 활성화 (왼쪽 클릭: 점 찍기, 오른쪽 클릭: 완료)" : "";
                
                // 다른 버튼들 비활성화
                document.querySelectorAll('.measure-button').forEach(btn => btn.classList.remove('active'));
            });
        }

        // 되돌리기 버튼
        const undoButton = document.getElementById('undoButton');
        if (undoButton) {
            undoButton.addEventListener('click', () => {
                const remainingPolygons = this.toolsManager.undoClipping();
                undoButton.disabled = remainingPolygons === 0;
            });
        }

        // 측정 버튼들
        document.querySelectorAll('.measure-button').forEach(button => {
            if (button.dataset.mode !== 'drawing') {
                button.addEventListener('click', () => {
                    this.toggleMeasureMode(button.dataset.mode);
                    
                    // 그리기 버튼 비활성화
                    const drawingButton = document.querySelector('button[data-mode="drawing"]');
                    if (drawingButton) {
                        drawingButton.classList.remove('active');
                    }
                    document.getElementById('drawingStatus').innerHTML = '';
                });
            }
        });

        // 레이어 패널 토글
        this.setupLayerPanelToggle();
    }

    toggleMeasureMode(mode) {
        // 현재 활성화된 도구가 측정이고 같은 모드라면 비활성화
        if (this.toolsManager.getActiveToolType() === 'measurement' && 
            this.toolsManager.measurementTools?.activeMeasureMode === mode) {
            this.toolsManager.deactivateAllTools();
            document.querySelectorAll('.measure-button').forEach(btn => btn.classList.remove('active'));
            return;
        }

        // 새로운 측정 모드 활성화
        this.toolsManager.activateMeasurement(mode);
        
        // UI 업데이트
        document.querySelectorAll('.measure-button').forEach(button => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });
    }

    setupLayerPanelToggle() {
        const toggleButton = document.getElementById('toggleButton');
        const panelContainer = document.querySelector('.panel-container');
        const arrow = toggleButton?.querySelector('.arrow');

        if (toggleButton && panelContainer && arrow) {
            let isPanelVisible = true;
            toggleButton.addEventListener('click', () => {
                isPanelVisible = !isPanelVisible;
                panelContainer.style.transform = isPanelVisible ? 'translateX(0)' : 'translateX(-280px)';
                arrow.classList.toggle('arrow-right', !isPanelVisible);
                arrow.classList.toggle('arrow-left', isPanelVisible);
            });
        }
    }

    updateLayerPanel() {
        const layerList = document.getElementById('layerList');
        if (!layerList) return;

        layerList.innerHTML = '';
        const layers = this.layerManager.getLayers();

        layers.forEach(layer => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            
            layerItem.innerHTML = `
                <span class="layer-name">${layer.name}</span>
                <div class="layer-controls">
                    <input type="checkbox" class="visibility-toggle" 
                        ${layer.visible ? 'checked' : ''}>
                    <input type="range" class="opacity-slider" 
                        min="0" max="100" value="${layer.opacity * 100}"
                        ${layer.visible ? '' : 'disabled'}>
                </div>
            `;

            const visibilityToggle = layerItem.querySelector('.visibility-toggle');
            const opacitySlider = layerItem.querySelector('.opacity-slider');

            visibilityToggle.addEventListener('change', (e) => {
                layer.setVisibility(e.target.checked);
            });
            opacitySlider.addEventListener('input', (e) => {
                layer.setOpacity(e.target.value / 99);
            });

            layerList.appendChild(layerItem);
        });
    }
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
    new App();
});