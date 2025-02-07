// Cesium 기본 설정
export const initializeCesium = (containerId) => {
    if (typeof Cesium === 'undefined') {
        throw new Error('Cesium is not loaded');
    }

    // Cesium Ion 토큰 설정
    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    if (!token) {
        throw new Error('Cesium Ion token is not configured');
    }
    Cesium.Ion.defaultAccessToken = token;

    // 뷰어 생성 및 설정
    const viewer = new Cesium.Viewer(containerId, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        maximumRenderTimeChange: 0.1,
        maximumCacheOverflowBytes: 536870912 * 10,
        cacheBytes: 536870912 * 10,
        requestRenderMode: true,
        maximumScreenSpaceError: 0,
        targetFrameRate: 10000,
        scene3DOnly: true,
        infoBox: true,
        dynamicScreenSpaceError: false,
        infoBox: true,
        timeline: false,
        animation: false,
        navigationHelpButton: false,
        homeButton: false,
        geocoder: false,
        baseLayerPicker: false,
        sceneModePicker: false,
        fullscreenButton: false,
        creditContainer: document.createElement('div') // Cesium ion 로고 제거
    });
    //viewer.infoBox.frame.sandbox = 'allow-same-origin allow-scripts allow-popups allow-top-navigation';
    viewer.scene.globe.shadows = Cesium.ShadowMode.DISABLED;
    
    // sandbox 제한 제거
    viewer.infoBox.frame.removeAttribute("sandbox");
    // 변경사항 적용을 위한 리로드
    viewer.infoBox.frame.src = "about:blank";


    // 글로벌 설정
    //viewer.scene.globe.tileCacheSize = 50;
    //viewer.scene.globe.maximumScreenSpaceError = 200;
    //viewer.scene.globe.depthTestAgainstTerrain = false;
    //viewer.scene.skyAtmosphere = new Cesium.SkyAtmosphere();
    viewer.scene.globe.enableLighting = false;
    //viewer.scene.highDynamicRange = true;
    viewer.scene.fog.enabled = false;
    viewer.scene.sun = undefined;
    //viewer.scene.groundAtmosphere.show = false;
    viewer.scene.globe.preloadSiblings = true;
    viewer.scene.globe.baseColor = Cesium.Color.WHITE;



    return viewer;
};