export class DrawingTools {
    constructor(viewer, tileset) {
        this.viewer = viewer;
        this.currentTileset = tileset;
        this.isDrawingMode = false;
        this.currentPoints = [];
        this.currentPointEntities = [];
        this.clippingPolygonsArray = [];
        this.handler = null;
        this.setupEventHandlers();
    }

    toggleDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        if (!this.isDrawingMode) {
            this.clearCurrentPoints();
        }
        return this.isDrawingMode;
    }

    clearCurrentPoints() {
        this.currentPoints = [];
        this.currentPointEntities.forEach(entity => this.viewer.entities.remove(entity));
        this.currentPointEntities = [];
    }

    addDrawingPoint(position) {
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);

        this.currentPoints.push(longitude, latitude);

        // 점 시각화
        const pointEntity = this.viewer.entities.add({
            position: position,
            point: {
                pixelSize: 10,
                color: Cesium.Color.YELLOW
            }
        });
        this.currentPointEntities.push(pointEntity);

        if (this.currentPoints.length >= 4) {
            this.updateTemporaryPolygon();
        }
    }

    updateTemporaryPolygon() {
        this.viewer.entities.add({
            polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray(this.currentPoints),
                material: Cesium.Color.WHITE.withAlpha(0),
                outline: true,
                outlineColor: Cesium.Color.YELLOW
            }
        });
    }

    createClippingPolygon() {
        if (this.currentPoints.length < 6) return;

        // 다각형을 닫기 위해 첫 번째 점 추가
        this.currentPoints.push(this.currentPoints[0], this.currentPoints[1]);

        const newClippingPolygon = new Cesium.ClippingPolygon({
            positions: Cesium.Cartesian3.fromDegreesArray(this.currentPoints)
        });

        this.clippingPolygonsArray.push(newClippingPolygon);

        if (this.currentTileset) {
            this.currentTileset.clippingPolygons = new Cesium.ClippingPolygonCollection({
                polygons: this.clippingPolygonsArray,
                edgeWidth: 1.0,
                enabled: true
            });
        }

        this.clearCurrentPoints();
        return this.clippingPolygonsArray.length;
    }

    undoClipping() {
        if (this.clippingPolygonsArray.length > 0) {
            this.clippingPolygonsArray.pop();
            
            if (this.currentTileset) {
                if (this.clippingPolygonsArray.length > 0) {
                    this.currentTileset.clippingPolygons = new Cesium.ClippingPolygonCollection({
                        polygons: this.clippingPolygonsArray,
                        edgeWidth: 1.0,
                        enabled: true
                    });
                } else {
                    this.currentTileset.clippingPolygons = new Cesium.ClippingPolygonCollection({
                        polygons: [],
                        enabled: false
                    });
                }
            }
        }
        return this.clippingPolygonsArray.length;
    }

    setupEventHandlers() {
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        
        this.handler.setInputAction((click) => {
            if (!this.isDrawingMode) return;
            
            const pickedPosition = this.viewer.scene.pickPosition(click.position);
            if (Cesium.defined(pickedPosition)) {
                this.addDrawingPoint(pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        this.handler.setInputAction((click) => {
            if (!this.isDrawingMode) return;
            if (this.currentPoints.length >= 6) {
                this.createClippingPolygon();
                this.toggleDrawingMode();
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    dispose() {
        this.clearCurrentPoints();
        if (this.handler) {
            this.handler.destroy();
            this.handler = null;
        }
        this.clippingPolygonsArray = [];
        if (this.currentTileset) {
            this.currentTileset.clippingPolygons = new Cesium.ClippingPolygonCollection({
                polygons: [],
                enabled: false
            });
        }
    }
}