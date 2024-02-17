navigator.geolocation.getCurrentPosition(function (position) {
    var map = new ymaps.Map("map", {
        center: [position.coords.latitude, position.coords.longitude],
            zoom: 15
    });
    var placemark = new ymaps.Placemark([position.coords.latitude, position.coords.longitude],{
        hintContent: "Ваше местоположение",
        ballonContent: "Вы находитесь здесь"
    }); 

    map.geoObjects.add(placemark);
})
