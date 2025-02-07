import { Layer } from './Layer';
import { errorHandler } from '../../utils/helpers';

export class LayerManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.layers = new Map();
        this.currentTileset = null;
        this.handler = null;
        this.setupLXMAPClickHandler();
        this.highlightedEntity = null;
        
        // 필터 관련 초기화
        this.initializeFilterControls();


        // 카메라 제한 설정
        this.setupCameraLimits();

        window.layerManager = this;


    }

    async loadTileset() {
        return await errorHandler(async () => {
            const tileset = await Cesium.Cesium3DTileset.fromUrl('/data/jejusi/tee/tileset.json', {
                //skipLevelOfDetail: true,
                //baseScreenSpaceError: 0,
                //skipScreenSpaceErrorFactor: 1,
                //skipLevels: 3,
                //immediatelyLoadDesiredLevelOfDetail: true,
                //loadSiblings: false,
                //cullWithChildrenBounds: true,
                maximumScreenSpaceError : 1, // 로딩 임계값 조정
                //maximumMemoryUsage : 16384, // 메모리 사용량 제한 (MB)
                //skipLevelOfDetail: true,
                //preloadWhenHidden : false, // 숨겨진 타일 미리 로드 방지
                //preferLeaves : true, // 리프 노드 우선 로딩
                
                
            });
            
            this.viewer.scene.primitives.add(tileset);
            
            
            // 타일셋 로드 완료 대기
            //await tileset.readyPromise;

            // 타일셋 높이 조절 (필요 시 사용 ==> 미 사용 시, cesiumConfig.js에 globe.depthTestAgainstTerrain = false 설정 필요)
            
            const heightOffset = 35; // 미터 단위, 필요에 따라 조절
            const boundingSphere = tileset.boundingSphere;
            const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
            const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
            const offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
            const translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
            tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
            


                // Adjust the brightness of the tileset
            tileset.style = new Cesium.Cesium3DTileStyle({
                color: "color('white', 0.9)", // Adjust the brightness here (0.5 is 90% brightness)
                
            });
            
            //tileset.shadows = Cesium.ShadowMode.DISABLED;
            const layer = new Layer('tileset', '3D 타일셋', tileset, 'tileset');
            this.layers.set('tileset', layer);
            //this.viewer.scene.brightness = 5.0;  // 1.0이 기본값
            await this.viewer.zoomTo(tileset);
            this.currentTileset = tileset;
            
            tileset.style = new Cesium.Cesium3DTileStyle({
                color: {
                    conditions: [
                        ['true', 'rgb(255, 255, 255) * 1.5']
                    ]
                }
            });
            
            
            return tileset;
        }, '타일셋 로드 실패');
    }

    async loadModel() {
        return await errorHandler(async () => {
            tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2915553);
            this.viewer.scene.primitives.add(tileset);
            
            const layer = new Layer('model', '제안로 3D 모델', tileset, 'datasource');
            this.layers.set('model', layer);
            
            await this.viewer.zoomTo(tileset);
            return tileset;
        }, '모델 로드 실패');
    }

    async loadGeoJSON() {

        function formatNumber(value) {
            return new Intl.NumberFormat('ko-KR').format(value);
        }


        return await errorHandler(async () => {
            // 먼저 tileset이 로드되었는지 확인
            if (!this.currentTileset) {
                console.warn('Tileset not loaded yet');
            }
    
            //const dataSource = await Cesium.GeoJsonDataSource.load('/data/building_lastest.geojson', {
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lod_sicheng_v4.geojson', {
                clampToGround: false
            });
    
                       
            // 뷰어에 추가
            await this.viewer.dataSources.add(dataSource);
            
            // 레이어 설정
            const layer = new Layer('geojson', '주소정보기본도', dataSource, 'datasource', 0.01, this.viewer);
            this.layers.set('geojson', layer);
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // Classification 설정
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    
                    // 기본 설정
                    entity.polygon.show = true;
                    
                    // 식별자 추가
                    entity.layerType = 'building_geojson';  // 특별한 속성 추가

                    // 높이 설정 - tileset에 맞춤
                    entity.polygon.height = undefined;  // 기본 높이 제거
                    entity.polygon.extrudedHeight = 135;  // 돌출 높이 제거
                    
                    //const height = entity.properties["높이"] ? entity.properties["높이"].getValue() : 0;
                    //entity.polygon.height = height + 100;  // 기본 높이 설정
                    //entity.polygon.extrudedHeight = height;  // 돌출 높이 설정
                    
                    const base_height = entity.properties["BLDH_MN"] ? entity.properties["BLDH_MN"].getValue() : 0;
                    const height = entity.properties["BLDH_BV"] ? entity.properties["BLDH_BV"].getValue() : 0;
                    entity.polygon.height = base_height;  // 기본 높이 설정
                    entity.polygon.extrudedHeight = base_height+height-30;  // 돌출 높이 설정

                    // 스타일 설정
                    entity.polygon.material = new Cesium.ColorMaterialProperty(
                        Cesium.Color.WHITE.withAlpha(0.01)
                    );
                    entity.polygon.outline =false;
                    entity.polygon.outlineColor = Cesium.Color.WHITE;
                    
                    // 렌더링 설정
                    entity.polygon.shadows = Cesium.ShadowMode.ENABLED;
                    entity.polygon.closeTop = true;
                    
                    
                    entity.description = new Cesium.CallbackProperty(() => {
                    let description = '<table class="cesium-infoBox-defaultTable">';
                    
                    // 표시할 속성 매핑
                    
                    
                    var displayProperties = {
                        'BATC_NM': '건물명',
                        'BFLR_CO': '지상층수',
                        '지하층수': '지하층수',
                        '토지_시군구명': '토지_시군구명',
                        '토지_읍면동명': '토지_읍면동명',
                        '토지_지번': '토지_지번',
                        '토지_지목': '토지_지목',
                        '토지_토지면적': '토지_면적(㎡)',
                        '토지_소유구분': '토지_소유구분',
                        '토지_공시가격': '토지_공시가격(원)',
                    };
                    
                    // 숫자 포맷팅이 필요한 속성들
                    const formatProperties = ['토지_공시가격']; 

                    if (entity.properties["주택공시가격"]?._value) {
                        displayProperties["주택공시가격"] = "표준주택 공시가격(원)"
                        formatProperties.push('주택공시가격')
                    }

                    
                    // 선택된 속성만 표시
                    Object.entries(displayProperties).forEach(([key, label]) => {
                        const value = entity.properties[key]?._value || '-';
                        if (formatProperties.includes(key) && value !== '-'){
                            description += `<tr><th>${label}</th><td>${formatNumber(value)}</td></tr>`;
                        } else {
                        description += `<tr><th>${label}</th><td>${value}</td></tr>`;
                    }
                    });
                    
                    /*// 모든 속성 표시
                    const propertyNames = entity.properties._propertyNames;
                    propertyNames.forEach(key => {
                        const value = entity.properties[key]._value;
                        description += `<tr><th>${key}</th><td>${value}</td></tr>`;
                    });*/
                    
                    description += '</table>';
                    
                    if (entity.properties["안내도"]?._value === "1") {

                        description += `
                                <div style="margin-top: 10px;">
                                <img src="/assets/sicheng.png" style="width: 100%; height: auto;" alt="건물 안내도">
                            </div>
                            <button onclick="window.open('http://building.jejusi.go.kr/', '_blank')"
                                    style="margin:10px 0; padding:5px 10px; 
                                        background-color:#007bff; color:white; 
                                        border:none; border-radius:3px; 
                                        cursor:pointer; width:100%;">
                               청사 안내도 보기
                            </button>`;
                            } else if(entity.properties["안내도"]?._value === "2"){
                                description += `
                                        <div style="margin-top: 10px;">
                                        <img src="/assets/hoban.png" style="width: 100%; height: auto;" alt="건물 안내도">
                                    </div>
                                    <button onclick="window.open('https://www.hobansummit-jjyd.co.kr/final/info/emodel.php', '_blank')"
                                            style="margin:10px 0; padding:5px 10px; 
                                                background-color:#007bff; color:white; 
                                                border:none; border-radius:3px; 
                                                cursor:pointer; width:100%;">
                                        단지 정보 보기
                                    </button>`;

                            } else if(entity.properties["안내도"]?._value === "3"){
                                    description += `
                                            <div style="margin-top: 10px;">
                                            <img src="/assets/carrot.png" style="width: 100%; height: auto;" alt="건물 안내도">
                                        </div>
                                        <button onclick="window.open('https://www.daangn.com/kr/realty/%EC%83%81%EA%B0%80-500%EB%A7%8C%EC%9B%90-700%EB%A7%8C%EC%9B%90-%EC%8B%9C%EC%B2%AD-%EB%A8%B9%EC%9E%90%EA%B3%A8%EB%AA%A9-%EA%B7%BC%EC%B2%98-%EB%8B%B9%EA%B7%BC%EB%B6%80%EB%8F%99%EC%82%B0-v8916mahopho/?in=%EC%9D%B4%EB%8F%842%EB%8F%99-3823', '_blank')"
                                                style="margin:10px 0; padding:5px 10px; 
                                                    background-color:#007bff; color:white; 
                                                    border:none; border-radius:3px; 
                                                    cursor:pointer; width:100%;">
                                            당근마켓
                                        </button>`;

                            } else if(entity.properties["안내도"]?._value === "4"){
                                description += `
                                        <div style="margin-top: 10px;">
                                        <img src="/assets/carrot.png" style="width: 100%; height: auto;" alt="건물 안내도">
                                    </div>
                                    <button onclick="window.open('https://www.daangn.com/kr/realty/%EC%83%81%EA%B0%80-1-000%EB%A7%8C%EC%9B%90-80%EB%A7%8C%EC%9B%90-%EC%A0%9C%EC%A3%BC%EC%8B%9C%EC%B2%AD-%EC%95%9E-%EB%8C%80%EB%A1%9C%EB%B3%80-%EC%83%81%EA%B6%8C-%EC%9C%A0%EB%8F%99%EC%9D%B8%EA%B5%AC-%EB%A7%8E%EC%9D%8C-%EB%A8%B9%EC%9E%90%EA%B3%A8%EB%AA%A9-%EB%8B%B9%EA%B7%BC%EB%B6%80%EB%8F%99%EC%82%B0-4ca7vmogv7tv/?in=%EC%9D%B4%EB%8F%842%EB%8F%99-3823', '_blank')"
                                            style="margin:10px 0; padding:5px 10px; 
                                                background-color:#007bff; color:white; 
                                                border:none; border-radius:3px; 
                                                cursor:pointer; width:100%;">
                                        당근마켓
                                    </button>`;

                             } else if(entity.properties["안내도"]?._value === "5"){
                                description += `
                                        <div style="margin-top: 10px;">
                                        <img src="/assets/carrot.png" style="width: 100%; height: auto;" alt="건물 안내도">
                                    </div>
                                    <button onclick="window.open('https://www.daangn.com/kr/realty/%EC%83%81%EA%B0%80-1-000%EB%A7%8C%EC%9B%90-1-200%EB%A7%8C%EC%9B%90-%EC%8B%9C%EC%B2%AD-%EB%A8%B9%EC%9E%90%EA%B3%A8%EB%AA%A9-%EC%BD%94%EB%84%88-%EB%8B%B9%EA%B7%BC%EB%B6%80%EB%8F%99%EC%82%B0-dfy77uaet9zj/?in=%EC%9D%B4%EB%8F%842%EB%8F%99-3823', '_blank')"
                                            style="margin:10px 0; padding:5px 10px; 
                                                background-color:#007bff; color:white; 
                                                border:none; border-radius:3px; 
                                                cursor:pointer; width:100%;">
                                        당근마켓
                                    </button>`;

                             } else if(entity.properties["안내도"]?._value === "6"){
                                description += `
                                        <div style="margin-top: 10px;">
                                        <img src="/assets/carrot.png" style="width: 100%; height: auto;" alt="건물 안내도">
                                    </div>
                                    <button onclick="window.open('https://www.daangn.com/kr/realty/%EC%83%81%EA%B0%80-800%EB%A7%8C%EC%9B%90-830%EB%A7%8C%EC%9B%90-%EC%8B%9C%EC%B2%AD-%EB%A8%B9%EC%9E%90%EA%B3%A8%EB%AA%A9-%EB%8D%98%ED%82%A8-%EB%8F%84%EB%84%88%EC%B8%A0-%EB%8B%B9%EA%B7%BC%EB%B6%80%EB%8F%99%EC%82%B0-kerczqg5v7bu/?in=%EC%9D%B4%EB%8F%842%EB%8F%99-3823', '_blank')"
                                            style="margin:10px 0; padding:5px 10px; 
                                                background-color:#007bff; color:white; 
                                                border:none; border-radius:3px; 
                                                cursor:pointer; width:100%;">
                                        당근마켓
                                    </button>`;

                             }                                          
                    return description;
                }, false);
                            
                        }
            });

            return dataSource;
        }, 'GeoJSON 로드 실패');
    }


    async loadLXMAP() {
        return await errorHandler(async () => {
            // 폴리곤 데이터 직접 로드
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lxmap_jejusi_v2.geojson', {
                clampToGround: true,
                fill: Cesium.Color.WHITE.withAlpha(0),  // 거의 투명하게 설정
                stroke: Cesium.Color.LIGHTBLUE,  // 외곽선 색상
                strokeWidth: 2  // 외곽선 두께
            });
            
            await this.viewer.dataSources.add(dataSource);
    
            // 레이어로 추가
            
            return dataSource;
        }, 'LX맵 로드 실패');
    }

    async load_jeju_100000() {
        return await errorHandler(async () => {
            // 폴리곤 데이터 직접 로드
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jeju_100000_part.geojson', {
                clampToGround: true,
                markerSize: 10,
                markerSymbol: '.',
                fill: Cesium.Color.RED.withAlpha(0),  // 거의 투명하게 설정
                //stroke: Cesium.Color.LIGHTBLUE,  // 외곽선 색상
                //strokeWidth: 0.5  // 외곽선 두께
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            
            // 레이어로 추가
            //const layer = new Layer('lxmap', 'LX맵', dataSource, 'lxmap');
            //this.layers.set('lxmap', layer);
    
            return dataSource;
        }, 'LX맵 로드 실패');
    }

    async loadLXMAP_LINE() {
        return await errorHandler(async () => {
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lxmap_jejusi_line_v2.geojson', {
                clampToGround: false,
                stroke: Cesium.Color.YELLOW,
                strokeWidth: 1
            });
            
            // 각 polyline의 높이 설정
            dataSource.entities.values.forEach(entity => {
                if (entity.polyline) {
                    // polyline의 높이를 설정 (원하는 높이 값으로 조정)
                    const height = 98; // 미터 단위
                    
                    // 기존 positions의 좌표를 가져와서 높이만 수정
                    const positions = entity.polyline.positions.getValue();
                    const newPositions = positions.map(position => {
                        const cartographic = Cesium.Cartographic.fromCartesian(position);
                        return Cesium.Cartesian3.fromRadians(
                            cartographic.longitude,
                            cartographic.latitude,
                            height  // 원하는 높이 설정
                        );
                    });
                    
                    // 새로운 positions 설정
                    entity.polyline.positions = newPositions;

                    // 직선으로 연결
                    entity.polyline.arcType = Cesium.ArcType.NONE;
                }
            });
            
            await this.viewer.dataSources.add(dataSource);

            // 레이어로 추가
            const layer = new Layer('lxmap', 'LX맵', dataSource, 'datasource', 0.01, this.viewer);
            this.layers.set('lxmap', layer);
            return dataSource;
        }, 'LX맵라인 로드 실패');
    }

    async loadBusstation() {
        return await errorHandler(async () => {
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/busstation.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),
                stroke: Cesium.Color.LIGHTBLUE,
                strokeWidth: 0
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            // API 호출 상태를 추적하기 위한 맵 초기화
            if (!this.busInfoRequests) {
                this.busInfoRequests = new Map();
            }
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // Classification 설정
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    
                    // 높이 설정
                    const base_height = entity.properties["BLDH_MN"]?.getValue() || 0;
                    const height = entity.properties["BLDH_BV"]?.getValue() || 0;
                    entity.polygon.height = base_height;
                    entity.polygon.extrudedHeight = base_height + height + 5;
    
                    // 정류장 정보 설정
                    const stationId = entity.properties["정류소ID"].getValue();
                    const stationName = entity.properties["정류소명"]?.getValue() || "정류소명 없음";
    
                    // 정적 description 설정
                    entity.description = {
                        getValue: () => {
                            if (!this.busInfoRequests.has(stationId)) {
                                this.busInfoRequests.set(stationId, {
                                    lastUpdate: 0,
                                    content: `
                                        <div style="padding: 10px;">
                                            <h3 style="margin-bottom: 10px;">${stationName}</h3>
                                            <p style="margin-bottom: 15px;">정류소 ID: ${stationId}</p>
                                            <div id="busArrivalInfo_${stationId}">
                                                <p>버스 도착 정보를 불러오는 중...</p>
                                            </div>
                                        </div>
                                    `
                                });
                            }
                            return this.busInfoRequests.get(stationId).content;
                        }
                    };
    
                    // 레이어 타입 표시를 위한 속성 추가
                    entity.layerType = 'busstation';
                }
            });
            
            this.viewer.scene.requestRender();
    
            // 레이어 생성 및 저장
            const layer = new Layer('busstation', '버스정류소', dataSource, 'datasource', 0.5, false, Cesium.Color.BLUE, this.viewer);
            this.layers.set('busstation', layer);
            
            return dataSource;
        }, '버스정류장 로드 실패');
    }
    
    async fetchBusArrivalInfo(station_name,stationId) {
        if (!this.busInfoRequests.has(stationId)) {
            // 초기 상태가 없으면 생성
            this.busInfoRequests.set(stationId, {
                lastUpdate: 0,
                content: `
                    <div style="padding: 10px;">
                        <h3>버스정류장</h3>
                        <p>정류소 ID: ${stationId}</p>
                        <div id="busArrivalInfo_${stationId}">
                            <p>버스 도착 정보를 불러오는 중...</p>
                        </div>
                    </div>
                `
            });
        }
        
        try {
            const response = await fetch(`https://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList?serviceKey=U%2Flfcppi%2FTBZhk%2BcpBpGt7rnd4xYsyMcm%2B%2BgDHyXlwh%2BDRekBMwPYHvV1xoTwYOmXXnihniaPu%2F9FwIooqyh5w%3D%3D&pageNo=1&numOfRows=30&_type=xml&cityCode=39&nodeId=${stationId}`);
            
            const data = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
    
            let arrivalInfo = `
                <div style="max-height: 300px; overflow-y: auto;">
                    <table class="cesium-infoBox-defaultTable">
                        <tr>
                            <th>버스번호</th>
                            <th>도착예정시간</th>
                            <th>버스유형</th>
                            <th>차량유형</th>
                        </tr>
            `;
            
            const items = xmlDoc.getElementsByTagName('item');
            
            if (items.length === 0) {
                arrivalInfo = '<p style="text-align: center; padding: 10px;">현재 도착 예정인 버스가 없습니다.</p>';
            } else {
                // 도착 정보를 배열로 변환하고 정렬
                const arrivalItems = Array.from(items).map(item => {
                    return {
                        routeNo: item.getElementsByTagName('routeno')[0]?.textContent || '-',
                        arrTime: parseInt(item.getElementsByTagName('arrtime')[0]?.textContent || '0'),
                        routeType: item.getElementsByTagName('routetp')[0]?.textContent || '-',
                        vehicleType: item.getElementsByTagName('vehicletp')[0]?.textContent || '-'
                    };
                });
        
                // 도착 시간으로 정렬
                arrivalItems.sort((a, b) => a.arrTime - b.arrTime);
        
                // 정렬된 정보를 테이블로 출력
                for (const item of arrivalItems) {
                    const arrTimeMinutes = Math.floor(item.arrTime / 60);
                    arrivalInfo += `
                        <tr>
                            <td>${item.routeNo}</td>
                            <td>${arrTimeMinutes}분</td>
                            <td>${item.routeType}</td>
                            <td>${item.vehicleType}</td>
                        </tr>
                    `;
                }
                arrivalInfo += '</table></div>';
            }
    
            // 현재 정류장 이름 가져오기 (에러 방지를 위한 안전한 방법)
            const currentRequest = this.busInfoRequests.get(stationId);
            let stationName = "버스정류장";
            
            try {
                if (currentRequest && currentRequest.content) {
                    const match = currentRequest.content.match(/<h3>(.*?)<\/h3>/);
                    if (match && match[1]) {
                        stationName = match[1];
                    }
                }
            } catch (e) {
                console.warn('정류장 이름 파싱 실패:', e);
            }
            
            this.busInfoRequests.set(stationId, {
                lastUpdate: Date.now(),
                content: `
                    <div style="padding: 10px;">
                        <h3 style="margin-bottom: 10px;">${station_name}</h3>
                        <p style="margin-bottom: 15px;">정류소 ID: ${stationId}</p>
                        <div id="busArrivalInfo_${stationId}">
                            ${arrivalInfo}
                        </div>
                        <p style="font-size: 0.8em; color: #666; text-align: right; margin-top: 10px;">
                            마지막 업데이트: ${new Date().toLocaleTimeString()}
                        </p>
                    </div>
                `
            });
    
        } catch (error) {
            console.error('버스 도착 정보 로드 실패:', error);
            
            // 에러 발생시 기본 정보로 표시
            this.busInfoRequests.set(stationId, {
                lastUpdate: Date.now(),
                content: `
                    <div style="padding: 10px;">
                        <h3 style="margin-bottom: 10px;">${stationname}</h3>
                        <p style="margin-bottom: 15px;">정류소 ID: ${stationId}</p>
                        <div id="busArrivalInfo_${stationId}">
                            <p style="color: red;">버스 도착 정보를 불러올 수 없습니다.</p>
                        </div>
                    </div>
                `
            });
        }
    }

    async loadhospital() {
        return await errorHandler(async () => {
            // 폴리곤 데이터 직접 로드
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lod_sicheng_v4_hospital.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),  // 거의 투명하게 설정
                stroke: Cesium.Color.LIGHTBLUE,  // 외곽선 색상
                strokeWidth: 0  // 외곽선 두께
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // Classification 설정
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    
                    // 높이 설정 - tileset에 맞춤
                    entity.polygon.height = undefined;  // 기본 높이 제거
                    entity.polygon.extrudedHeight = 135;  // 돌출 높이 제거
                    
                    const base_height = entity.properties["BLDH_MN"] ? entity.properties["BLDH_MN"].getValue() : 0;
                    const height = entity.properties["BLDH_BV"] ? entity.properties["BLDH_BV"].getValue() : 0;
                    entity.polygon.height = base_height;  // 기본 높이 설정
                    entity.polygon.extrudedHeight = base_height+height-20;  // 돌출 높이 설정
                    
                        }
            });
            
            this.viewer.scene.requestRender();
            // 레이어로 추가
            const layer = new Layer('hospital', '병원', dataSource, 'datasource', 0.5, false, Cesium.Color.BLUE, this.viewer);
            this.layers.set('hospital', layer);
            

            return dataSource;
        }, '버스정류장 로드 실패');
    }
    async loadhospital() {
        return await errorHandler(async () => {
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lod_sicheng_v4_hospital.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),
                stroke: Cesium.Color.LIGHTBLUE,
                strokeWidth: 0
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // 기존 설정 유지
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    const base_height = entity.properties["BLDH_MN"]?.getValue() || 0;
                    const height = entity.properties["BLDH_BV"]?.getValue() || 0;
                    entity.polygon.height = base_height;
                    entity.polygon.extrudedHeight = base_height + height - 20;
                    
                    // 층별 정보 표시를 위한 description 설정
                    entity.description = new Cesium.CallbackProperty(() => {
                        let description = '<table class="cesium-infoBox-defaultTable">';
                        
                        // 기본 건물 정보 표시
                        const basicProperties = {
                            'BATC_NM': '건물명',
                            'BFLR_CO': '지상층수',
                            '지하층수': '지하층수',
                            '토지_시군구명': '토지_시군구명',
                            '토지_읍면동명': '토지_읍면동명',
                            '토지_지번': '토지_지번',
                            '토지_지목': '토지_지목',
                            '토지_토지면적': '토지_면적(㎡)',
                            '토지_소유구분': '토지_소유구분',
                            '토지_공시가격': '토지_공시가격(원)',
                        };
                        
                        Object.entries(basicProperties).forEach(([key, label]) => {
                            const value = entity.properties[key]?._value || '-';
                            description += `<tr><th>${label}</th><td>${value}</td></tr>`;
                        });
                        
                        description += '</table>';
                        
                        // 층별 정보 표시
                        description += '<h4 style="margin-top: 15px; margin-bottom: 10px;">병원 정보</h4>';
                        description += '<table class="cesium-infoBox-defaultTable">';
                        description += '<tr><th>층</th><th>병원명</th></tr>';
                        
                        // 층별 데이터 처리 (속성 이름이 floor_1, floor_2 등으로 저장되어 있다고 가정)
                        for (let i = entity.properties["BFLR_CO"].getValue(); i >= 1; i--) {
                            const floorInfo = entity.properties[`${i}층`]?.getValue();
                            if (floorInfo) {
                                description += `<tr><td>${i}층</td><td>${floorInfo}</td></tr>`;
                            }
                        }
                        
                        description += '</table>';
                        
                        return description;
                    }, false);
                }
            });
            
            this.viewer.scene.requestRender();
            
            const layer = new Layer('hospital', '병원', dataSource, 'datasource', 0.5, false, Cesium.Color.BLUE, this.viewer);
            this.layers.set('hospital', layer);
            
            return dataSource;
        }, '병원 로드 실패');
    }

    async loadpharmacy() {
        return await errorHandler(async () => {
            // 폴리곤 데이터 직접 로드
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lod_sicheng_v4_pharmacy.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),  // 거의 투명하게 설정
                stroke: Cesium.Color.LIGHTBLUE,  // 외곽선 색상
                strokeWidth: 0  // 외곽선 두께
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // Classification 설정
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    
                    // 높이 설정 - tileset에 맞춤
                    entity.polygon.height = undefined;  // 기본 높이 제거
                    entity.polygon.extrudedHeight = 135;  // 돌출 높이 제거
                    
                    const base_height = entity.properties["BLDH_MN"] ? entity.properties["BLDH_MN"].getValue() : 0;
                    const height = entity.properties["BLDH_BV"] ? entity.properties["BLDH_BV"].getValue() : 0;
                    entity.polygon.height = base_height;  // 기본 높이 설정
                    entity.polygon.extrudedHeight = base_height+height-0;  // 돌출 높이 설정
                    
                    entity.description = new Cesium.CallbackProperty(() => {
                        let description = '<table class="cesium-infoBox-defaultTable">';
                        
                        // 기본 건물 정보 표시
                        const basicProperties = {
                            'BATC_NM': '건물명',
                            'BFLR_CO': '지상층수',
                            '지하층수': '지하층수',
                            '토지_시군구명': '토지_시군구명',
                            '토지_읍면동명': '토지_읍면동명',
                            '토지_지번': '토지_지번',
                            '토지_지목': '토지_지목',
                            '토지_토지면적': '토지_면적(㎡)',
                            '토지_소유구분': '토지_소유구분',
                            '토지_공시가격': '토지_공시가격(원)',
                        };
                        
                        Object.entries(basicProperties).forEach(([key, label]) => {
                            const value = entity.properties[key]?._value || '-';
                            description += `<tr><th>${label}</th><td>${value}</td></tr>`;
                        });
                        
                        description += '</table>';
                        
                        // 층별 정보 표시
                        description += '<h4 style="margin-top: 15px; margin-bottom: 10px;">약국 정보</h4>';
                        description += '<table class="cesium-infoBox-defaultTable">';
                        description += '<tr><th>층</th><th>약국명</th></tr>';
                        
                        // 층별 데이터 처리 (속성 이름이 floor_1, floor_2 등으로 저장되어 있다고 가정)
                        for (let i = entity.properties["BFLR_CO"].getValue(); i >= 1; i--) {
                            const floorInfo = entity.properties[`${i}층`]?.getValue();
                            if (floorInfo) {
                                description += `<tr><td>${i}층</td><td>${floorInfo}</td></tr>`;
                            }
                        }
                        
                        description += '</table>';
                        
                        return description;
                    }, false);

                        }
            });
            
            this.viewer.scene.requestRender();
            // 레이어로 추가
            const layer = new Layer('pharmacy', '약국', dataSource, 'datasource', 0.5, false, Cesium.Color.BLUE, this.viewer);
            this.layers.set('pharmacy', layer);
            

            return dataSource;
        }, '약국 로드 실패');
    }

    async loadconvenior() {
        return await errorHandler(async () => {
            // 폴리곤 데이터 직접 로드
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lod_sicheng_v4_convenior.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),  // 거의 투명하게 설정
                stroke: Cesium.Color.LIGHTBLUE,  // 외곽선 색상
                strokeWidth: 0  // 외곽선 두께
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // Classification 설정
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    
                    // 높이 설정 - tileset에 맞춤
                    entity.polygon.height = undefined;  // 기본 높이 제거
                    entity.polygon.extrudedHeight = 135;  // 돌출 높이 제거
                    
                    const base_height = entity.properties["BLDH_MN"] ? entity.properties["BLDH_MN"].getValue() : 0;
                    const height = entity.properties["BLDH_BV"] ? entity.properties["BLDH_BV"].getValue() : 0;
                    entity.polygon.height = base_height;  // 기본 높이 설정
                    entity.polygon.extrudedHeight = base_height+height-20;  // 돌출 높이 설정
                    
                    entity.description = new Cesium.CallbackProperty(() => {
                        let description = '<table class="cesium-infoBox-defaultTable">';
                        
                        // 기본 건물 정보 표시
                        const basicProperties = {
                            'BATC_NM': '건물명',
                            'BFLR_CO': '지상층수',
                            '지하층수': '지하층수',
                            '토지_시군구명': '토지_시군구명',
                            '토지_읍면동명': '토지_읍면동명',
                            '토지_지번': '토지_지번',
                            '토지_지목': '토지_지목',
                            '토지_토지면적': '토지_면적(㎡)',
                            '토지_소유구분': '토지_소유구분',
                            '토지_공시가격': '토지_공시가격(원)',
                        };
                        
                        Object.entries(basicProperties).forEach(([key, label]) => {
                            const value = entity.properties[key]?._value || '-';
                            description += `<tr><th>${label}</th><td>${value}</td></tr>`;
                        });
                        
                        description += '</table>';
                        
                        // 층별 정보 표시
                        description += '<h4 style="margin-top: 15px; margin-bottom: 10px;">편의점 정보</h4>';
                        description += '<table class="cesium-infoBox-defaultTable">';
                        description += '<tr><th>층</th><th>편의점명</th></tr>';
                        
                        // 층별 데이터 처리 (속성 이름이 floor_1, floor_2 등으로 저장되어 있다고 가정)
                        for (let i = entity.properties["BFLR_CO"].getValue(); i >= 1; i--) {
                            const floorInfo = entity.properties[`${i}층`]?.getValue();
                            if (floorInfo) {
                                description += `<tr><td>${i}층</td><td>${floorInfo}</td></tr>`;
                            }
                        }
                        
                        description += '</table>';
                        
                        return description;
                    }, false);

                }
            });
            
            this.viewer.scene.requestRender();
            // 레이어로 추가
            const layer = new Layer('convenior', '편의점', dataSource, 'datasource', 0.5, false, Cesium.Color.BLUE, this.viewer);
            this.layers.set('convenior', layer);
            

            return dataSource;
        }, '편의점 로드 실패');
    }

    async loadstandard_building() {
        return await errorHandler(async () => {
            // 폴리곤 데이터 직접 로드
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lod_sicheng_v4_standard.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),  // 거의 투명하게 설정
                stroke: Cesium.Color.LIGHTBLUE,  // 외곽선 색상
                strokeWidth: 0  // 외곽선 두께
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // Classification 설정
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    
                    // 높이 설정 - tileset에 맞춤
                    entity.polygon.height = undefined;  // 기본 높이 제거
                    entity.polygon.extrudedHeight = 135;  // 돌출 높이 제거
                    
                    const base_height = entity.properties["BLDH_MN"] ? entity.properties["BLDH_MN"].getValue() : 0;
                    const height = entity.properties["BLDH_BV"] ? entity.properties["BLDH_BV"].getValue() : 0;
                    entity.polygon.height = base_height;  // 기본 높이 설정
                    entity.polygon.extrudedHeight = base_height+height-20;  // 돌출 높이 설정
                    
                        }
            });
            
            this.viewer.scene.requestRender();
            // 레이어로 추가
            const layer = new Layer('standard_building', '표준주택', dataSource, 'datasource', 0.5, false, Cesium.Color.BLUE, this.viewer);
            this.layers.set('standard_building', layer);
            

            return dataSource;
        }, '표준주택 로드 실패');
    }

    async loadstandard_land() {
        return await errorHandler(async () => {
            // 폴리곤 데이터 직접 로드
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lxmap_jejusi_v3_standard.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),  // 거의 투명하게 설정
                stroke: Cesium.Color.LIGHTBLUE,  // 외곽선 색상
                strokeWidth: 2  // 외곽선 두께
            });
            
            await this.viewer.dataSources.add(dataSource);
                    
            this.viewer.scene.requestRender();
            // 레이어로 추가
            const layer = new Layer('standard_land', '표준지', dataSource, 'datasource', 0.5, false, Cesium.Color.YELLOW, this.viewer);
            this.layers.set('standard_land', layer);
            

            return dataSource;
        }, '표준지 로드 실패');
    }

    async loadcarrot() {
        return await errorHandler(async () => {
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lod_sicheng_v4_carrot.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),
                stroke: Cesium.Color.LIGHTBLUE,
                strokeWidth: 0
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // Classification 설정
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    
                    // 높이 설정
                    const base_height = entity.properties["BLDH_MN"] ? entity.properties["BLDH_MN"].getValue() : 0;
                    const height = entity.properties["BLDH_BV"] ? entity.properties["BLDH_BV"].getValue() : 0;
                    entity.polygon.height = base_height;
                    entity.polygon.extrudedHeight = base_height + height - 0;
    
                    // 안내도 값에 따른 매물 정보 설정
                    let propertyInfo = {};
                    switch(entity.properties["안내도"]?.getValue()) {
                        case "3":
                            propertyInfo = {
                                "매물유형": "상가",
                                "보증금": "500만원",
                                "연세":"700만원",
                                "위치": "시청 먹자골목 근처",
                                "특징": "유동인구 많음",
                                "링크": "https://www.daangn.com/kr/realty/%EC%83%81%EA%B0%80-500%EB%A7%8C%EC%9B%90-700%EB%A7%8C%EC%9B%90-%EC%8B%9C%EC%B2%AD-%EB%A8%B9%EC%9E%90%EA%B3%A8%EB%AA%A9-%EA%B7%BC%EC%B2%98-%EB%8B%B9%EA%B7%BC%EB%B6%80%EB%8F%99%EC%82%B0-v8916mahopho"
                            };
                            break;
                        case "4":
                            propertyInfo = {
                                "매물유형": "상가",
                                "보증금": "1,000만원",
                                "월세": "80만원",
                                "위치": "제주시청 앞 대로변",
                                "특징": "대로변 상권, 유동인구 많음",
                                "링크": "https://www.daangn.com/kr/realty/%EC%83%81%EA%B0%80-1-000%EB%A7%8C%EC%9B%90-80%EB%A7%8C%EC%9B%90-%EC%A0%9C%EC%A3%BC%EC%8B%9C%EC%B2%AD-%EC%95%9E-%EB%8C%80%EB%A1%9C%EB%B3%80-%EC%83%81%EA%B6%8C-%EC%9C%A0%EB%8F%99%EC%9D%B8%EA%B5%AC-%EB%A7%8E%EC%9D%8C-%EB%A8%B9%EC%9E%90%EA%B3%A8%EB%AA%A9-%EB%8B%B9%EA%B7%BC%EB%B6%80%EB%8F%99%EC%82%B0-4ca7vmogv7tv"
                            };
                            break;
                        case "5":
                            propertyInfo = {
                                "매물유형": "상가",
                                "보증금": "1,000만원",
                                "연세":"1,200만원",
                                "위치": "시청 먹자골목 코너",
                                "특징": "코너 위치, 가시성 좋음",
                                "링크": "https://www.daangn.com/kr/realty/%EC%83%81%EA%B0%80-1-000%EB%A7%8C%EC%9B%90-1-200%EB%A7%8C%EC%9B%90-%EC%8B%9C%EC%B2%AD-%EB%A8%B9%EC%9E%90%EA%B3%A8%EB%AA%A9-%EC%BD%94%EB%84%88-%EB%8B%B9%EA%B7%BC%EB%B6%80%EB%8F%99%EC%82%B0-dfy77uaet9zj"
                            };
                            break;
                        case "6":
                            propertyInfo = {
                                "매물유형": "상가",
                                "보증금": "800만원",
                                "연세": "830만원",
                                "위치": "시청 먹자골목 던킨도너츠",
                                "특징": "프랜차이즈 입점 가능",
                                "링크": "https://www.daangn.com/kr/realty/%EC%83%81%EA%B0%80-800%EB%A7%8C%EC%9B%90-830%EB%A7%8C%EC%9B%90-%EC%8B%9C%EC%B2%AD-%EB%A8%B9%EC%9E%90%EA%B3%A8%EB%AA%A9-%EB%8D%98%ED%82%A8-%EB%8F%84%EB%84%88%EC%B8%A0-%EB%8B%B9%EA%B7%BC%EB%B6%80%EB%8F%99%EC%82%B0-kerczqg5v7bu"
                            };
                            break;
                    }
    
                    if (Object.keys(propertyInfo).length > 0) {
                        entity.description = new Cesium.CallbackProperty(() => {
                            // 기본 정보 테이블 생성
                            let description = '<table class="cesium-infoBox-defaultTable">';
                            
                            // 표시할 속성 매핑
                            var displayProperties = {
                                'BATC_NM': '건물명',
                                'BFLR_CO': '지상층수',
                                '토지_시군구명': '토지_시군구명',
                                '토지_읍면동명': '토지_읍면동명',
                                '토지_지번': '토지_지번',
                                '토지_지목': '토지_지목',
                                '토지_토지면적': '토지_면적(㎡)'
                            };
                            
                            // 기본 정보 표시
                            Object.entries(displayProperties).forEach(([key, label]) => {
                                const value = entity.properties[key]?._value || '-';
                                description += `<tr><th>${label}</th><td>${value}</td></tr>`;
                            });
                            
                            description += '</table>';
                            
                            // 매물 정보 테이블 추가
                            description += '<h4 style="margin-top: 15px; margin-bottom: 10px;">매물 정보</h4>';
                            description += '<table class="cesium-infoBox-defaultTable">';
                            Object.entries(propertyInfo).forEach(([key, value]) => {
                                if (key !== "링크") {
                                    description += `<tr><th>${key}</th><td>${value}</td></tr>`;
                                }
                            });
                            description += '</table>';
                            
                            // 당근마켓 이미지와 링크 버튼 추가
                            description += `
                                <div style="margin-top: 15px; text-align: center;">
                                    <img src="/assets/carrot.png" style="width: 150px; height: auto; margin-bottom: 10px;" alt="당근마켓">
                                    <button onclick="window.open('${propertyInfo.링크}', '_blank')"
                                            style="width: 100%; padding: 8px; 
                                                   background-color: #FF8A3D; 
                                                   color: white; 
                                                   border: none; 
                                                   border-radius: 4px; 
                                                   cursor: pointer;
                                                   font-weight: bold;">
                                        당근마켓에서 보기
                                    </button>
                                </div>`;
                            
                            return description;
                        }, false);
                    }
                }
            });
            
            this.viewer.scene.requestRender();
    
            // 레이어 생성 및 저장
            const layer = new Layer('carrot', '당근마켓', dataSource, 'datasource', 0.5, false, Cesium.Color.BLUE, this.viewer);
            this.layers.set('carrot', layer);
            
            return dataSource;
        }, '당근마켓 매물 로드 실패');
    }

    async loadapt() {
        return await errorHandler(async () => {
            // 폴리곤 데이터 직접 로드
            const dataSource = await Cesium.GeoJsonDataSource.load('/data/jejusi/lod_sicheng_v4_apt.geojson', {
                clampToGround: true,
                fill: Cesium.Color.BLUE.withAlpha(0.5),  // 거의 투명하게 설정
                stroke: Cesium.Color.LIGHTBLUE,  // 외곽선 색상
                strokeWidth: 0  // 외곽선 두께
            });
            
            await this.viewer.dataSources.add(dataSource);
            
            dataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                    // Classification 설정
                    entity.polygon.classificationType = Cesium.ClassificationType.CESIUM_3D_TILE;
                    
                    // 높이 설정 - tileset에 맞춤
                    entity.polygon.height = undefined;  // 기본 높이 제거
                    entity.polygon.extrudedHeight = 135;  // 돌출 높이 제거
                    
                    const base_height = entity.properties["BLDH_MN"] ? entity.properties["BLDH_MN"].getValue() : 0;
                    const height = entity.properties["BLDH_BV"] ? entity.properties["BLDH_BV"].getValue() : 0;
                    entity.polygon.height = base_height;  // 기본 높이 설정
                    entity.polygon.extrudedHeight = base_height+height-20;  // 돌출 높이 설정
                    
                        }
            });
            
            this.viewer.scene.requestRender();
            // 레이어로 추가
            const layer = new Layer('apt', '아파트 분양', dataSource, 'datasource', 0.5, false, Cesium.Color.BLUE, this.viewer);
            this.layers.set('apt', layer);
            

            return dataSource;
        }, '아파트분양 로드 실패');
    }

    setupLXMAPClickHandler() {
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        this.handler.setInputAction((click) => {
            const ray = this.viewer.camera.getPickRay(click.position);
            const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            
            if (cartesian) {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                const clickedLon = Cesium.Math.toDegrees(cartographic.longitude);
                const clickedLat = Cesium.Math.toDegrees(cartographic.latitude);
    
                const pickedFeatures = this.viewer.scene.drillPick(click.position);
                
                // 1순위: 특별 레이어(carrot, 병원, 약국, 편의점) feature 찾기
                let specialFeature = pickedFeatures.find(feature => 
                    feature.id && 
                    feature.id.polygon && 
                    feature.id.properties && 
                    (
                        // 기존 carrot 레이어 조건
                        (feature.id.properties["안내도"]?.getValue() >= "3" && 
                         feature.id.properties["안내도"]?.getValue() <= "6") ||
                        // 병원 레이어 조건
                        (feature.id.properties["카테고리"]?.getValue() === "병원") ||
                        // 약국 레이어 조건
                        (feature.id.properties["카테고리"]?.getValue() === "약국") ||
                        // 편의점 레이어 조건
                        (feature.id.properties["카테고리"]?.getValue() === "편의점")
                    )
                );
    
                // 2순위: 버스정류장 feature 찾기
                let busStationFeature = pickedFeatures.find(feature => 
                    feature.id && 
                    feature.id.polygon && 
                    feature.id.properties &&
                    feature.id.properties["정류소ID"]
                );
    
                // 3순위: 건물 feature 찾기
                let buildingFeature = pickedFeatures.find(feature => 
                    feature.id && 
                    feature.id.polygon && 
                    feature.id.properties &&
                    feature.id.layerType === 'building_geojson'
                );
                
                let lxmapFeature = pickedFeatures.find(feature => 
                    feature.id && 
                    feature.id.polygon && 
                    feature.id.properties &&
                    !feature.id.layerType
                );
    
                // 우선순위에 따라 현재 선택된 feature 결정
                const currentFeature = specialFeature || busStationFeature || buildingFeature || lxmapFeature;
    
                // 이미 선택된 엔티티를 다시 클릭한 경우
                if (this.selectedEntity && currentFeature && this.selectedEntity === currentFeature.id) {
                    // 일반 건물인 경우만 초기화
                    console.log(!this.isSpecialLayer(this.selectedEntity))
                    if (!this.isSpecialLayer(this.selectedEntity)) {
                        this.resetEntityStyle(this.selectedEntity);
                        this.viewer.selectedEntity = undefined;
                        this.selectedEntity = null;
                        this.originalHeight = null;
                        this.viewer.scene.requestRender();
                    }
                    return;
                }
    
                // 이전 선택된 엔티티의 스타일 초기화
                if (this.selectedEntity) {
                    if (!this.isSpecialLayer(this.selectedEntity)) {
                        this.resetEntityStyle(this.selectedEntity);
                    } else {
                        this.resetSpecialLayerStyle(this.selectedEntity);
                    }
                }
    
                // 새로운 엔티티 선택
                if (currentFeature) {
                    this.selectedEntity = currentFeature.id;
                    this.viewer.scene.requestRender();
    
                    // 레이어별 스타일 적용
                    this.applyLayerStyle(this.selectedEntity);
                    this.viewer.selectedEntity = this.selectedEntity;
                    this.viewer.scene.requestRender();
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
    
    // 특별 레이어 여부 확인 헬퍼 함수
    isSpecialLayer(entity) {
        return (
            entity.properties["정류소ID"] ||
            entity.properties["안내도"]?.getValue() >= "3" && 
            entity.properties["안내도"]?.getValue() <= "6" ||
            (entity.properties["카테고리"]?.getValue() === '병원' || entity.properties["카테고리"]?.getValue() === '약국' || entity.properties["카테고리"]?.getValue() === '편의점')
        );
    }
    
    // 일반 엔티티 스타일 초기화
    resetEntityStyle(entity) {
        entity.polygon.material = new Cesium.ColorMaterialProperty(
            Cesium.Color.WHITE.withAlpha(0.01)
        );
        entity.polygon.outline = false;
        if (entity.layerType === 'building_geojson' && this.originalHeight !== null) {
            entity.polygon.extrudedHeight = this.originalHeight;
        }
    }
    
    // 특별 레이어 스타일 초기화
    resetSpecialLayerStyle(entity) {
        entity.polygon.material = new Cesium.ColorMaterialProperty(
            Cesium.Color.BLUE.withAlpha(0.5)
        );
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(1)
    }
    
    // 레이어별 스타일 적용
    applyLayerStyle(entity) {
        // Carrot 레이어
        if (entity.properties["안내도"]?.getValue() >= "3" && 
            entity.properties["안내도"]?.getValue() <= "6") {
            entity.polygon.material = new Cesium.ColorMaterialProperty(
                Cesium.Color.ORANGE.withAlpha(0.3)
            );
        }
        // 병원 레이어
        else if (entity.properties["카테고리"]?.getValue() === "병원") {
            entity.polygon.material = new Cesium.ColorMaterialProperty(
                Cesium.Color.ORANGE.withAlpha(0.3)
            );
        }
        // 약국 레이어
        else if (entity.layerType === 'pharmacy') {
            entity.polygon.material = new Cesium.ColorMaterialProperty(
                Cesium.Color.ORANGE.withAlpha(0.3)
            );
        }
        // 편의점 레이어
        else if (entity.layerType === 'convenior') {
            entity.polygon.material = new Cesium.ColorMaterialProperty(
                Cesium.Color.ORANGE.withAlpha(0.3)
            );
        }
        // 버스정류장
        else if (entity.properties["정류소ID"]) {
            entity.polygon.material = new Cesium.ColorMaterialProperty(
                Cesium.Color.ORANGE.withAlpha(0.5)
            );
            const stationId = entity.properties["정류소ID"].getValue();
            const stationname = entity.properties["명칭"].getValue();
            this.fetchBusArrivalInfo(stationname, stationId);
        }
        // 일반 건물
        else if (entity.layerType === 'building_geojson') {
            this.originalHeight = entity.polygon.extrudedHeight.getValue();
            entity.polygon.extrudedHeight = this.originalHeight * 1.05;
            entity.polygon.material = new Cesium.ColorMaterialProperty(
                Cesium.Color.RED.withAlpha(0.3)
            );
        }
        // LX맵
        else if (!entity.layerType) {
            entity.polygon.material = new Cesium.ColorMaterialProperty(
                Cesium.Color.YELLOW.withAlpha(0.3)
            );
        }
    
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.RED;
    }

    initializeFilterControls() {
        // 필터 토글 버튼
        const filterToggle = document.getElementById('filterToggle');
        const filterOptions = document.getElementById('filterOptions');
        
        const filterToggle_land = document.getElementById('filterToggle_land');
        const filterOptions_land = document.getElementById('filterOptions_land');
        
        if (filterToggle && filterOptions) {
            filterToggle.addEventListener('click', () => {
                console.log('Filter toggle clicked');  // 디버깅용
                const isHidden = filterOptions.style.display === 'none';
                filterOptions.style.display = isHidden ? 'block' : 'none';
                filterToggle.textContent = isHidden ? '필터 닫기' : '필터 설정';
            });
        }

        if (filterToggle_land && filterOptions_land) {
            filterToggle_land.addEventListener('click', () => {
                console.log('Filter toggle clicked');  // 디버깅용
                const isHidden = filterOptions_land.style.display === 'none';
                filterOptions_land.style.display = isHidden ? 'block' : 'none';
                filterToggle_land.textContent = isHidden ? '필터 닫기' : '필터 설정';
            });
        }

        // 필터 적용 버튼
        const applyFilter = document.getElementById('applyFilter');
        if (applyFilter) {
            applyFilter.addEventListener('click', () => {
                console.log('Applying filter');  // 디버깅용
                this.applyBuildingFilter();
            });
        }

        // 필터 초기화 버튼
        const resetFilter = document.getElementById('resetFilter');
        if (resetFilter) {
            resetFilter.addEventListener('click', () => {
                console.log('Resetting filter');  // 디버깅용
                this.resetFilter();
            });
        }

        // 디버깅용 로그
        console.log('Filter controls initialized:', {
            filterToggle: !!filterToggle,
            filterOptions: !!filterOptions,
            applyFilter: !!applyFilter,
            resetFilter: !!resetFilter
        });

        // 필터 적용 버튼
        const applyFilter_land = document.getElementById('applyFilter_land');
        if (applyFilter_land) {
            applyFilter_land.addEventListener('click', () => {
                console.log('Applying filter');  // 디버깅용
                this.applyLandFilter();
            });
        }

        // 필터 초기화 버튼
        const resetFilter_land = document.getElementById('resetFilter_land');
        if (resetFilter_land) {
            resetFilter_land.addEventListener('click', () => {
                console.log('Resetting filter');  // 디버깅용
                this.resetFilter_land();
            });
        }

        // 디버깅용 로그
        console.log('Filter controls initialized:', {
            filterToggle: !!filterToggle,
            filterOptions: !!filterOptions,
            applyFilter_land: !!applyFilter_land,
            resetFilter: !!resetFilter
        });

    }

    // 필터 적용 함수
    applyBuildingFilter() {
        const standardFilter = document.getElementById('standardFilter').value;
        //const heightFilter = document.getElementById('heightFilter').value;
        const pnuFilter = document.getElementById('heightFilter').value;

        console.log('Applying filters:', { owner: standardFilter, height: heightFilter });
        
        const geojsonLayer = this.layers.get('geojson');
        if (!geojsonLayer || !geojsonLayer.entity) {
            console.warn('GeoJSON layer not found');
            return;
        }

        const dataSource = geojsonLayer.entity;
        dataSource.entities.values.forEach(entity => {
            if (entity.polygon) {
                const standardxor = entity.properties["주택공시가격"]?.getValue();
                const buildingHeight = entity.properties["BLDH_BV"]?.getValue() || 0;
                const base_height = entity.properties["BLDH_MN"]?.getValue() || 0;
                const buildingpnu = entity.properties["PNU_NO"]?.getValue() || 0;


                // 필터 조건 확인
                let matchesstandard = !standardFilter || standardxor;
                //let matchesHeight = false;
                
                // PNU 필터링(테스트용)
                let matchespnu = !pnuFilter || buildingpnu === pnuFilter;

                // 스타일 적용
                if (matchesstandard && matchespnu) {
                    entity.polygon.material = new Cesium.ColorMaterialProperty(
                        Cesium.Color.HOTPINK.withAlpha(0.5)
                    );
                    const currentHeight = entity.polygon.extrudedHeight.getValue();
                    entity.polygon.extrudedHeight = currentHeight * 1.1;
                } else {
                    entity.polygon.material = new Cesium.ColorMaterialProperty(
                        Cesium.Color.WHITE.withAlpha(0.01)
                    );
                    entity.polygon.height = base_height;
                    entity.polygon.extrudedHeight = base_height + buildingHeight - 30;
                }
            }
        });
    }

    applyLandFilter() {
        const standardFilter_land = document.getElementById('standardFilter_land').value;
        
        const lxmapLayer = this.layers.get('lxmap');
        if (!lxmapLayer || !lxmapLayer.entity) {
            console.warn('LXmap layer not found');
            return;
        }

        const dataSource = lxmapLayer.entity;
        dataSource.entities.values.forEach(entity => {
            if (entity.polygon) {
                const standardxor_land = entity.properties["표준지_결정지가"]?.getValue();

                // 필터 조건 확인
                let matchesstandard_land = !standardFilter_land || standardxor_land;
                

                // 스타일 적용
                if (matchesstandard_land) {
                    entity.polygon.material = new Cesium.ColorMaterialProperty(
                        Cesium.Color.YELLOW.withAlpha(0.5)
                    );
                } else {
                    entity.polygon.material = new Cesium.ColorMaterialProperty(
                        Cesium.Color.WHITE.withAlpha(0.01)
                    );
                
                }
            }
        });
    }

    // 필터 초기화 함수
    resetFilter() {
        // select 요소들 초기화
        document.getElementById('standardFilter').value = '';
        document.getElementById('heightFilter').value = '';
        
        const geojsonLayer = this.layers.get('geojson');
        if (!geojsonLayer || !geojsonLayer.entity) return;

        const dataSource = geojsonLayer.entity;
        dataSource.entities.values.forEach(entity => {
            if (entity.polygon) {
                const base_height = entity.properties["BLDH_MN"]?.getValue() || 0;
                const height = entity.properties["BLDH_BV"]?.getValue() || 0;
                
                entity.polygon.material = new Cesium.ColorMaterialProperty(
                    Cesium.Color.WHITE.withAlpha(0.01)
                );
                entity.polygon.height = base_height;
                entity.polygon.extrudedHeight = base_height + height - 30;
            }
        });
    }

    // 필터 초기화 함수
    resetFilter_land() {
        // select 요소들 초기화
        document.getElementById('standardFilter_land').value = '';
        
        const lxmapLayer = this.layers.get('lxmap');
        if (!lxmapLayer || !lxmapLayer.entity) return;

        const dataSource = lxmapLayer.entity;
        dataSource.entities.values.forEach(entity => {
            if (entity.polygon) {
                entity.polygon.material = new Cesium.ColorMaterialProperty(
                    Cesium.Color.WHITE.withAlpha(0.01)
                );
            }
        });
    }

        // 카메라 컨트롤러
    setupCameraLimits() {
        // 최소/최대 높이 설정 (미터 단위)
        const minHeight = 5; // 최소 높이
        const maxHeight = 2000; // 최대 높이

        // 최소/최대 줌 레벨 설정
        const minZoom = 20; // 최소 줌 거리
        const maxZoom = 5000; // 최대 줌 거리

        this.viewer.scene.screenSpaceCameraController.minimumZoomDistance = minZoom;
        this.viewer.scene.screenSpaceCameraController.maximumZoomDistance = maxZoom;

        // 카메라 이벤트 리스너 설정
        this.viewer.camera.changed.addEventListener(() => {
            const cameraHeight = this.viewer.camera.positionCartographic.height;
            
            // 높이 제한
            if (cameraHeight < minHeight) {
                this.viewer.camera.position = Cesium.Cartesian3.fromRadians(
                    this.viewer.camera.positionCartographic.longitude,
                    this.viewer.camera.positionCartographic.latitude,
                    minHeight
                );
            } else if (cameraHeight > maxHeight) {
                this.viewer.camera.position = Cesium.Cartesian3.fromRadians(
                    this.viewer.camera.positionCartographic.longitude,
                    this.viewer.camera.positionCartographic.latitude,
                    maxHeight
                );
            }
        });

        // 틸트 각도 제한 (옵션)
        this.viewer.scene.screenSpaceCameraController.minimumPitch = Cesium.Math.toRadians(-90); // 수직 아래로 보기 제한
        this.viewer.scene.screenSpaceCameraController.maximumPitch = Cesium.Math.toRadians(0); // 수평선까지만 보기 허용
    }

    

    getLayers() {
        return this.layers;
    }

    getCurrentTileset() {
        return this.currentTileset;
    }

    dispose() {
        this.layers.forEach(layer => layer.dispose());
        this.layers.clear();
        this.currentTileset = null;
    }
}