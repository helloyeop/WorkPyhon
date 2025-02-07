import { createRightAngleSymbol } from '../../utils/helpers';

export class MeasurementTools {
    constructor(viewer, layerManager) {
        this.viewer = viewer;
        this.layerManager = layerManager;
        this.handler = undefined;
        this.measureEntities = [];
        this.measurePoints = [];
        this.activeMeasureMode = null;
        this.originalClickHandler = null;
    }

    clearMeasurement() {
        try {
            if (this.measureEntities) {
                this.measureEntities.forEach(entity => {
                    if (entity) this.viewer.entities.remove(entity);
                });
            }
        } catch (error) {
            console.error('Error clearing measurements:', error);
        }
        this.measureEntities = [];
        this.measurePoints = [];
    }

    create3DDistanceMeasurement(point1, point2) {
        if (!Cesium.defined(point1) || !Cesium.defined(point2)) {
            console.warn('Invalid points for distance measurement');
            return;
        }
        
        const cartographic1 = Cesium.Cartographic.fromCartesian(point1);
        const cartographic2 = Cesium.Cartographic.fromCartesian(point2);
        
        // 수직선을 위한 점 생성
        const verticalPoint = Cesium.Cartesian3.fromRadians(
            cartographic1.longitude,
            cartographic1.latitude,
            cartographic2.height
        );
        const groundpoint = Cesium.Cartesian3.fromRadians(
            cartographic2.longitude,
            cartographic2.latitude,
            cartographic1.height
        );

        // 거리 계산
        const directDistance = Cesium.Cartesian3.distance(point1, point2);
        const horizontalDistance = Cesium.Cartesian3.distance(point1, groundpoint);
        const verticalDistance = Math.abs(cartographic2.height - cartographic1.height);

        // 직선(빗변) 그리기
        this.measureEntities.push(this.viewer.entities.add({
            polyline: {
                positions: [point1, point2],
                width: 2,
                material: Cesium.Color.RED,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        }));

        // 수평선 그리기
        this.measureEntities.push(this.viewer.entities.add({
            polyline: {
                positions: [point1, verticalPoint],
                width: 2,
                material: Cesium.Color.BLUE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        }));

        // 수직선 그리기
        this.measureEntities.push(this.viewer.entities.add({
            polyline: {
                positions: [verticalPoint, point2],
                width: 2,
                material: Cesium.Color.GREEN,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        }));

        // 직각 표시
        this.measureEntities.push(this.viewer.entities.add({
            position: groundpoint,
            billboard: {
                image: createRightAngleSymbol(),
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                scale: 0.5,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        }));

        // 거리 레이블 표시
        this.addDistanceLabels(point1, point2, verticalPoint, directDistance, horizontalDistance, verticalDistance);
    }

    addDistanceLabels(point1, point2, verticalPoint, directDistance, horizontalDistance, verticalDistance) {
        const labelOptions = {
            font: '14px sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            showBackground: true,
            backgroundColor: Cesium.Color.WHITE.withAlpha(0.7),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        };

        // 직선(빗변) 거리
        const directMidPoint = Cesium.Cartesian3.midpoint(point1, point2, new Cesium.Cartesian3());
        this.measureEntities.push(this.viewer.entities.add({
            position: directMidPoint,
            label: {
                ...labelOptions,
                text: `직선: ${directDistance.toFixed(2)}m`,
                fillColor: Cesium.Color.RED
            }
        }));

        // 수평 거리
        const horizontalMidPoint = Cesium.Cartesian3.midpoint(point1, verticalPoint, new Cesium.Cartesian3());
        this.measureEntities.push(this.viewer.entities.add({
            position: horizontalMidPoint,
            label: {
                ...labelOptions,
                text: `높이: ${verticalDistance.toFixed(2)}m`,
                fillColor: Cesium.Color.BLUE
            }
        }));

        // 수직 거리
        const verticalMidPoint = Cesium.Cartesian3.midpoint(verticalPoint, point2, new Cesium.Cartesian3());
        this.measureEntities.push(this.viewer.entities.add({
            position: verticalMidPoint,
            label: {
                ...labelOptions,
                text: `수평: ${horizontalDistance.toFixed(2)}m`,
                fillColor: Cesium.Color.GREEN
            }
        }));
    }

    calculateArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const p1 = points[i];
            const p2 = points[j];
            area += p1.x * p2.y - p2.x * p1.y;
        }
        return Math.abs(area) / 2;
    }

    setupEventHandlers() {
        // 기존 핸들러 제거
        if (this.handler) {
            this.handler.destroy();
        }

        // LayerManager의 클릭 핸들러 임시 저장 및 제거
        if (this.layerManager && this.layerManager.handler) {
            this.originalClickHandler = this.layerManager.handler;
            this.layerManager.handler.destroy();
            this.layerManager.handler = null;
        }

        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        
        this.handler.setInputAction((click) => {
            if (!this.activeMeasureMode) return;
            
            const tileset = this.layerManager.currentTileset;
            if (!tileset) {
                console.warn('타일셋이 로드되지 않았습니다.');
                return;
            }

                // 카메라에서 클릭 위치로의 ray 생성
            const ray = this.viewer.camera.getPickRay(click.position);
            if (!ray) {
                console.warn('레이를 생성할 수 없습니다.');
                return;
            }

            const tilesetIntersection = this.viewer.scene.pickFromRay(ray, [tileset]);
            if (!tilesetIntersection || !tilesetIntersection.position) {
                console.warn('타일셋과의 교차점을 찾을 수 없습니다.');
                return;
            }

            const pickedPosition = tilesetIntersection.position;
            this.measurePoints.push(pickedPosition);
            
            // 점 시각화
            this.measureEntities.push(this.viewer.entities.add({
                position: pickedPosition,
                point: {
                    pixelSize: 10,
                    color: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                }
            }));

            // 측정 모드에 따른 처리
            if (this.activeMeasureMode === '3d-distance' && this.measurePoints.length === 2) {
                this.create3DDistanceMeasurement(
                    this.measurePoints[0], 
                    this.measurePoints[1]
                );
                this.deactivateMeasurement();
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // 측정 모드 취소
        this.handler.setInputAction(() => {
            this.deactivateMeasurement();
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    addAreaLabel(position, area) {
        this.measureEntities.push(this.viewer.entities.add({
            position: position,
            label: {
                text: `면적: ${area.toFixed(2)}㎡`,
                font: '14px sans-serif',
                fillColor: Cesium.Color.WHITE,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineWidth: 2,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -10),
                showBackground: true,
                backgroundColor: Cesium.Color.BLACK.withAlpha(0.7)
            }
        }));
    }

    deactivateMeasurement() {
        this.activeMeasureMode = null;
        this.measurePoints = [];
        
        // 핸들러 제거
        if (this.handler) {
            this.handler.destroy();
            this.handler = undefined;
        }

        // LayerManager의 클릭 핸들러 복원
        if (this.layerManager && this.originalClickHandler) {
            this.layerManager.setupLXMAPClickHandler();
            this.originalClickHandler = null;
        }
    }

    setMeasureMode(mode) {
        // 기존 측정 정리
        this.clearMeasurement();

        // 유효한 측정 모드인지 확인
        const validModes = ['3d-distance', 'area'];
        if (!validModes.includes(mode)) {
            console.warn('Invalid measurement mode');
            return;
        }

        this.activeMeasureMode = mode;
        this.setupEventHandlers();
    }

    destroy() {
        this.deactivateMeasurement();
        this.clearMeasurement();
    }
}