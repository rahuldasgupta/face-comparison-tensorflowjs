import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Lottie from 'react-lottie';
import Modal from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";

import scanning from './images/scanning.json'; 
import check_mark from './images/check-mark.json';
import wrong from './images/wrong.json'; 
import "bootstrap/dist/css/bootstrap.min.css";
import './App.css';

const queryParams =  new URLSearchParams(window.location.search);

const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: scanning,
  rendererSettings: {
    preserveAspectRatio: 'xMidYMid slice'
  }
}
const defaultOptions_2 = {
  loop: true,
  autoplay: true,
  animationData: check_mark,
  rendererSettings: {
    preserveAspectRatio: 'xMidYMid slice'
  }
}
const defaultOptions_3 = {
  loop: true,
  autoplay: true,
  animationData: wrong,
  rendererSettings: {
    preserveAspectRatio: 'xMidYMid slice'
  }
}
const animationStyles = {
  width: "90%",
  marginLeft:"5%",
  height: '200px',
  marginTop: "-230px",
};
const animationStyles_2 = {
  width: '300px',
  height: '300px',
  backgroundColor:"transparent"
};
const animationStyles_3 = {
  width: '200px',
  height: '200px',
  backgroundColor:"transparent"
};

function App() {
  const datasetRef = useRef();
  const selfieRef = useRef();

  const [isMatched, setIsMatched] = useState(false);
  const [isChecked, setChecked] = useState(false);
  const [datasetImage, setDatasetImage] = useState("");
  const [selfieImage, setSelfieImage] = useState("");
  const [loaderModal, setLoaderModal] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [markedModal, setMarkedModal] = useState(false);

  const renderFace = async (image, x, y, width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    context?.drawImage(image, x, y, width, height, 0, 0, width, height);
    canvas.toBlob((blob) => {
      image.src = URL.createObjectURL(blob);
    }, "image/jpeg");
  };

  useEffect(() => {
    (async () => {
      await getUserData()
      // loading the models
      await faceapi.nets.ssdMobilenetv1.loadFromUri('models');
      //await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('models');
      //await faceapi.nets.faceExpressionNet.loadFromUri('/models');

      // detect a single face from the ID card image
      const datasetFaceDetection = await faceapi.detectSingleFace(datasetRef.current,
        new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks().withFaceDescriptor();

      // detect a single face from the selfie image
      const selfieFacedetection = await faceapi.detectSingleFace(selfieRef.current,
        new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks().withFaceDescriptor();

      if (datasetFaceDetection) {
        const { x, y, width, height } = datasetFaceDetection.detection.box;
        renderFace(datasetRef.current, x, y, width, height);
      }

      if (selfieFacedetection) {
        const { x, y, width, height } = selfieFacedetection.detection.box;
        renderFace(selfieRef.current, x, y, width, height);
      }

      /**
       * Do face comparison only when faces were detected
       */
      if(datasetFaceDetection && selfieFacedetection){
        setChecked(true)
        const distance = faceapi.euclideanDistance(datasetFaceDetection.descriptor, selfieFacedetection.descriptor);
        let filterDistance = (1-distance)*100
        console.log(filterDistance, distance)
        if(distance<0.5){
          setIsMatched(true);
          setMarkedModal(true);
          markAttendance();
        }
        else{
          setIsMatched(false)
          setMarkedModal(true)
        }
      }
    })();
  }, []);
  const markAttendance = async() => {
    let session_id = queryParams.get("session_id");

    let user = {
      "session_id": session_id,
      "isMarked": "True"
    }

    await fetch("https://nielit-icsas.in/api/admin/update_session_isMarked.php", {
        method: "POST",
        body: JSON.stringify(user),
        headers: {
          Accept: "application/json,  */*",
          "Content-Type": "multipart/form-data",
        },
      })
    .then((response) => response.json())
    .then((responseJson) => {
      console.log(responseJson)
    })
  }
  const getUserData = async() => {
    let session_id = queryParams.get("session_id");
    await fetch("https://nielit-icsas.in/api/admin/faceData.php?session_id="+session_id, {
        method: "GET",
    })
    .then((response) => response.json())
    .then((responseJson) => {
      console.log(responseJson)
      setDatasetImage(responseJson.passport_photo)
      setSelfieImage(responseJson.selfie_url)
      setLoaderModal(false)
      setTimeout(() => {
        setIsDataLoaded(true)
      }, 400);
    })
  }


  return (
    <div className='main'>
      <Modal
          show={loaderModal}
          backdrop="static"
          keyboard={false}
          centered
          size="md"
          className="transaprentModal"
      >
          <ModalBody>
            <center>
              <img className='loader' src={require('./images/loader.gif')} alt="Loader" />
            </center>
          </ModalBody>
      </Modal>
      <Modal
          show={markedModal}
          backdrop="static"
          keyboard={false}
          centered
          size="md"
          className="transaprentModal"
      >
          <ModalBody>
            <center>
              {
                isMatched ?
                <>
                  <Lottie options={defaultOptions_2}  style={animationStyles_2}/>
                  <p className='attendance_marked'>Attendance Marked</p>
                </>
                :
                <>
                  <Lottie options={defaultOptions_3}  style={animationStyles_3}/>
                  <p className='attendance_marked_2'>Face does not match</p>
                </>
              }
            </center>
          </ModalBody>
      </Modal>
      <center>
        <img className='logo' src={require('./images/logo_white.png')} alt="ID card" height="auto" />
        <span className='infoTitle'>Admin<br/>Face Recognition</span>
      </center>
      <div className="main-container">
        <Row>
          <Col md={6} sm={6} xs={6}>
            <div className="gallery">
             <center> <p className='headerTxt'>Selfie</p> </center>
              <img ref={datasetRef} src={selfieImage} alt="ID card" height="auto" crossOrigin='anonymous' />
            </div>
            {
              isChecked ?
              <></>
              :
              <>
                {
                  isDataLoaded == false ?
                  <></>
                  :
                  <Lottie options={defaultOptions}  style={animationStyles}/>
                }
              </>
            }
          </Col>
          <Col md={6} sm={6} xs={6}>
            <div className="gallery">
              <center> <p className='headerTxt'>Dataset</p> </center>
              <img ref={selfieRef} src={datasetImage} crossOrigin='anonymous' alt="Selfie" height="auto" />
            </div>
          </Col>
        </Row>
      </div>
      <br clear="all"/>
      <center>
      <div className='faces_info' style={{backgroundColor: isChecked ? isMatched ? "#2bc48a" : "#fb1752" : "#f4c430"}}>
        {
          isChecked ?
          <p>{isMatched ? "Faces are matched" : "Faces does not match"}</p>
          :
          <p>Processing Image</p>
        }
      </div>
      {
        isChecked ?
        <></>
        :
        <div className='faces_info_reload' onClick={() => window.location.reload()} style={{backgroundColor: "transparent"}}>
          <p>Stuck? Reload</p>
        </div>
      }
      </center>
    </div>
  );
}

export default App;
