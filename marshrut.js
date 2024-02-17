ymaps.ready(init);

function init() {
  // Стоимость за километр.
  var DELIVERY_TARIFF = 20,
    // Минимальная стоимость.
    MINIMUM_COST = 500;
  // https://tech.yandex.ru/maps/jsbox/2.1/input_validation
  // Подключаем поисковые подсказки к полю ввода.
  var suggestView = new ymaps.SuggestView('suggest1'),
    suggestView = new ymaps.SuggestView('suggest2'),
    map, routePanelControl,
    addrFrom, addrTo;


  map = new ymaps.Map('map', {
    center: [55.75, 37.65],
    zoom: 9,
    controls: []
  });
  // Создадим панель маршрутизации.
  routePanelControl = new ymaps.control.RoutePanel({
    options: {
      // Добавим заголовок панели.
      showHeader: true,
      title: 'Расчёт маршрута'
    }
  });
  var zoomControl = new ymaps.control.ZoomControl({
    options: {
      size: 'small',
      float: 'none',
      position: {
        bottom: 145,
        right: 10
      }
    }
  });
  // Пользователь сможет построить только автомобильный маршрут.
  routePanelControl.routePanel.options.set({
    types: {
      auto: true
    }
  });
  // Неизменяемые точки "откуда" и "куда"
  routePanelControl.routePanel.state.set({
    fromEnabled: false,
    toEnabled: false
  });

  map.controls.add(routePanelControl).add(zoomControl);


  // При клике по кнопке запускаем верификацию введёных данных и построение маршрута
  $('#button1').bind('click', function(e) {
    geocode('#suggest1');
  });
  $('#button2').bind('click', function(e) {
    geocode('#suggest2');
  });
  $('#button3').bind('click', function(e) {
    if (addrFrom && addrTo) {
      showRoute(addrFrom.getAddressLine(), addrTo.getAddressLine());
    } else {
      $('#notice3').css('display', 'block');
    }
  });

  function geocode(ctrl_id) {
    // Забираем запрос из поля ввода.
    var request = $(ctrl_id).val();
    // Геокодируем введённые данные.
    ymaps.geocode(request).then(function(res) {
      var obj = res.geoObjects.get(0),
        error, hint;

      if (obj) {
        // Об оценке точности ответа геокодера можно прочитать тут: https://tech.yandex.ru/maps/doc/geocoder/desc/reference/precision-docpage/
        switch (obj.properties.get('metaDataProperty.GeocoderMetaData.precision')) {
          case 'exact':
            break;
          case 'number':
          case 'near':
          case 'range':
            error = 'Неточный адрес, требуется уточнение';
            hint = 'Уточните номер дома';
            break;
          case 'street':
            error = 'Неполный адрес, требуется уточнение';
            hint = 'Уточните номер дома';
            break;
          case 'other':
          default:
            error = 'Неточный адрес, требуется уточнение';
            hint = 'Уточните адрес';
        }
      } else {
        error = 'Адрес не найден';
        hint = 'Уточните адрес';
      }

      // Если геокодер возвращает пустой массив или неточный результат, то показываем ошибку.
      if (error) {
        if (ctrl_id == '#suggest1') {
          addrFrom = null
        } else {
          addrTo = null
        }
        showError(ctrl_id, error);
        showMessage(ctrl_id, hint);
      } else {
        if (ctrl_id == '#suggest1') {
          addrFrom = obj
        } else {
          addrTo = obj
        }
        showResult(ctrl_id);
      }
      if (addrFrom && addrTo) {
        $('#notice3').css('display', 'none');
      } else {
        $('#notice3').css('display', 'block');
      }
    }, function(e) {
      console.log(e)
    })

  }

  function showResult(ctrl_id) {
    // Удаляем сообщение об ошибке, если найденный адрес совпадает с поисковым запросом.
    $(ctrl_id).removeClass('input_error');
    $('#notice1').css('display', 'none');
    $('#notice2').css('display', 'none');
    // полный адрес для сообщения под картой.
    if (ctrl_id == '#suggest1') {
      showMessage(ctrl_id, addrFrom.getAddressLine());
    } else {
      showMessage(ctrl_id, addrTo.getAddressLine());
    }
    // Сохраняем укороченный адрес для подписи метки.
    //shortAddress = [obj.getThoroughfare(), obj.getPremiseNumber(), obj.getPremise()].join(' ');
  }

  function showError(ctrl_id, message) {
    $(ctrl_id).addClass('input_error');
    if (ctrl_id == '#suggest1') {
      $('#notice1').text(message);
      $('#notice1').css('display', 'block');
    } else {
      $('#notice2').text(message);
      $('#notice2').css('display', 'block');
    }

  }


  function showRoute(from, to) {
    // https://tech.yandex.ru/maps/jsbox/2.1/deliveryCalculator 
    routePanelControl.routePanel.state.set({
      from: from,
      to: to
    });
    // Получим ссылку на маршрут.
    routePanelControl.routePanel.getRouteAsync().then(function(route) {
      // Зададим максимально допустимое число маршрутов, возвращаемых мультимаршрутизатором.
      route.model.setParams({
        results: 1
      }, true);
      // Повесим обработчик на событие построения маршрута.
      route.model.events.add('requestsuccess', function() {
        var activeRoute = route.getActiveRoute();
        if (activeRoute) {
          // Получим протяженность маршрута.
          var length = route.getActiveRoute().properties.get("distance");
          // Вычислим стоимость доставки.
          price = calculate(Math.round(length.value / 1000)),
            // Создадим макет содержимого балуна маршрута.
            balloonContentLayout = ymaps.templateLayoutFactory.createClass(
              '<span>Расстояние: ' + length.text + '.</span><br/>' +
              '<span style="font-weight: bold; font-style: italic"></span>');
          // Зададим этот макет для содержимого балуна.
          route.options.set('routeBalloonContentLayout', balloonContentLayout);
          // Откроем балун.
          activeRoute.balloon.open();
        }
      });
    });
  }

  function showMessage(ctrl_id, message) {
    if (ctrl_id == '#suggest1') {
      $('#messageHeader1').html('<b>Пункт отправления:</b>');
      $('#message1').html(message);
    } else {
      $('#messageHeader2').html('<b>Пункт назначения:</b>');
      $('#message2').html(message);
    }
  }

  // Функция, вычисляющая стоимость доставки.
  function calculate(routeLength) {
    return Math.max(routeLength * DELIVERY_TARIFF, MINIMUM_COST);
  }
}

