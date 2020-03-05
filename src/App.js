

import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import classnames from 'classnames';
import { Map, Marker, GoogleApiWrapper, Polyline } from 'google-maps-react';
import './App.css';

const apiKey = '';

function App({ google }) {
  const streetViewEl = useRef(null);
  const sv = new google.maps.StreetViewService();
  const loopCount = useRef(0);
  const startInterval = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(50);
  const [showMap, setShowMap] = useState(false);
  const [guessLatLng, setGuessLatLng] = useState();
  const goalLatLng = useRef();
  const [gameOver, setGameOver] = useState(false);
  const [distance, setDistance] = useState();
  const guessIcon = useRef({
    url: "guess-pin.png",
    anchor: new google.maps.Point(8,20),
    scaledSize: new google.maps.Size(16,20)
  });
  const correctIcon = useRef({
    url: "correct-pin.png",
    anchor: new google.maps.Point(8,20),
    scaledSize: new google.maps.Size(16,20)
  });

  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (!startInterval.current) {
        return;
      }
      setSecondsLeft(secondsLeft => secondsLeft - 1);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    }
  }, []);
  useEffect(() => {
    if (secondsLeft <= 0) {
      setGameOver(true);
    }
  }, [secondsLeft]);
  const initStreetView = ({ map, latLng }) => {
    startInterval.current = true;
    goalLatLng.current = latLng;
    const panorama = new google.maps.StreetViewPanorama(streetViewEl.current, {
      position: latLng,
    });
    panorama.setOptions({
      showRoadLabels: false,
      addressControl: false,
    });
    map.setStreetView(panorama);
  };
  const getRandomInRange = ({ from, to, fixed }) => {
    return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
  };
  const getLatLng = async () => {
    const randomLat = getRandomInRange({ from: -23.467236, to: -23.661259, fixed: 6 });
    const randomLng = getRandomInRange({ from: -46.766973, to: -46.433853, fixed: 6 });
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${randomLat},${randomLng}&key=${apiKey}`
    );
    return response?.data?.results[0]?.geometry?.location;
  };
  const onReadyHandler = async (mapProps, map) => {
    if (loopCount.current > 10) {
      return;
    }

    const latLng = await getLatLng();
    sv.getPanorama({ location: latLng, radius: 50 }, (data, status) => {
      if (status !== 'OK') {
        loopCount.current++;
        return onReadyHandler(mapProps, map);
      }
      initStreetView({ map, latLng });
    });
  };
  const toggleViews = () => {
    setShowMap(showMap => !showMap);
  };

  const onClickHandler = (mapProps, map, event) => {
    if (gameOver) {
      return;
    }
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setGuessLatLng({ lat, lng });
  };

  const calculateDistance = (latLng1, latLng2) => {
    const { lat: lat1, lng: lng1 } = latLng1;
    const { lat: lat2, lng: lng2 } = latLng2;
    if ((lat1 === lat2) && (lng1 === lng2)) {
      return 0;
    }
    const radlat1 = Math.PI * lat1/180;
    const radlat2 = Math.PI * lat2/180;
    const theta = lng1-lng2;
    const radtheta = Math.PI * theta/180;
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515 * 1.609344;
    return dist;
  };

  const confirmGuess = () => {
    setDistance(calculateDistance(goalLatLng.current, guessLatLng));
    setGameOver(true);
  }

  return (
    <div className="App">
      <Map
        google={google}
        onReady={onReadyHandler}
        className="View--hide"
      />
      <div className={classnames('MapView', { 'View--hide': !(showMap || gameOver), 'MapView--small': !gameOver })}>
        <Map
          google={google}
          zoom={12}
          initialCenter={{ lat: -23.574720, lng: -46.634618 }}
          onClick={onClickHandler}
        >
          {guessLatLng && <Marker position={guessLatLng} icon={guessIcon.current} />}
          {gameOver && <Marker position={goalLatLng.current} icon={correctIcon.current} />}
          {gameOver && (
            <Polyline
              path={[
                guessLatLng,
                goalLatLng.current
              ]}
              strokeColor="#000000"
              strokeOpacity={0.8}
              strokeWeight={2}
            />
          )}
        </Map>
      </div>
      <div className={classnames('StreetView', { 'StreetView--small': showMap || gameOver, 'View--hide': gameOver })} ref={streetViewEl} />
      {!gameOver && (
        <>
          <div className="Seconds">{secondsLeft}</div>
          <button className="ToggleButton" onClick={toggleViews}>
            {showMap ? '🚗 Street view' : '💡 Guess'}
          </button>
          {guessLatLng && (
            <button className="ConfirmButton" onClick={confirmGuess}>
              ✅ Confirm guess
            </button>
          )}
        </>
      )}
      {distance && (
        <div className="Distance">{distance.toFixed(2)}km</div>
      )}
    </div>
  );
}

export default GoogleApiWrapper({
  apiKey,
})(App);

