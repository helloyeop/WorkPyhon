export class Layer {
    constructor(id, name, entity, type, initialOpacity = 1.0, initialVisibility = true, color = Cesium.Color.WHITE, viewer) {
        this.id = id;
        this.name = name;
        this.entity = entity;
        this.type = type;
        this.color = color;
        this.viewer = viewer;

        this.setVisibility(initialVisibility); // 초기 가시성 적용
        this.setOpacity(initialOpacity);       // 초기 투명도 적용
    }

    setVisibility(visible) {
        
        this.visible = visible;
        
        if (this.type === 'datasource') {
        
            this.entity.entities.values.forEach(entity => {
                entity.show = visible;
            });
        
        } else if (this.type ==='tileset') {
            this.entity.show = visible;
        }
        
        // 렌더링 요청 시점 확인
        
        if (this.viewer && this.viewer.scene) {
            
            this.viewer.scene.requestRender();
        }
    }

    setOpacity(opacity) {
        this.opacity = opacity;
        if (this.type === 'tileset') {
            this.entity.style = new Cesium.Cesium3DTileStyle({
                color: `rgba(255, 255, 255, ${opacity})`
            });
        } else if (this.type === 'datasource') {
            this.entity.entities.values.forEach(entity => {
                if (entity.polygon) {
                    entity.polygon.material = new Cesium.ColorMaterialProperty(
                        this.color.withAlpha(opacity)
                    );
                }
            });
        }
    }

    dispose() {
        // 리소스 정리
        if (this.entity) {
            if (this.type === 'tileset') {
                this.entity.destroy();
            } else if (this.type === 'datasource') {
                this.entity.entities.removeAll();
            }
        }
    }
}