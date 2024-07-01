import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Lottie from 'react-lottie';
import Modal from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import { initializeApp } from 'firebase/app';
import moment from "moment";
import { collection, query, where, getDocs, getFirestore, doc, setDoc } from "firebase/firestore";

import checkMark from './images/check-mark.json';
import wrong from './images/wrong.json'; 
import "bootstrap/dist/css/bootstrap.min.css";
import './App.css';

const queryParams = new URLSearchParams(window.location.search);

const firebaseConfig = {
  apiKey: "AIzaSyBmZ9odbp_CfRWHs4bETrVmgHyAo1VCdd0",
  authDomain: "dyrs-nagaland.firebaseapp.com",
  projectId: "dyrs-nagaland",
  storageBucket: "dyrs-nagaland.appspot.com",
  messagingSenderId: "479154911562",
  appId: "1:479154911562:web:16f629fe05b97634c729b3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const defaultOptions = (animationData) => ({
  loop: true,
  autoplay: true,
  animationData,
  rendererSettings: {
    preserveAspectRatio: 'xMidYMid slice'
  }
});

const animationStyles = (width, height, marginLeft = "0%", marginTop = "0px") => ({
  width,
  height,
  marginLeft,
  marginTop,
  backgroundColor: "transparent"
});

function App() {
  const datasetRef = useRef();
  const selfieRef = useRef();

  const [isMatched, setIsMatched] = useState(false);
  const [isChecked, setChecked] = useState(false);
  const [datasetImage, setDatasetImage] = useState("");
  const [selfieImage, setSelfieImage] = useState("");
  const [loaderModal, setLoaderModal] = useState(true);
  const [markedModal, setMarkedModal] = useState(false);

  const renderFace = (image, x, y, width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    context.drawImage(image, x, y, width, height, 0, 0, width, height);
    canvas.toBlob((blob) => {
      image.src = URL.createObjectURL(blob);
    }, "image/jpeg");
  };

  const loadModels = async () => {
    //await faceapi.nets.ssdMobilenetv1.loadFromUri('models');
    await faceapi.nets.tinyFaceDetector.loadFromUri('models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('models');

  };

  const detectFaces = async () => {
    const [datasetFaceDetection, selfieFaceDetection] = await Promise.all([
      faceapi.detectSingleFace(datasetRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor(),
      faceapi.detectSingleFace(selfieRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor()
    ]);

    if (datasetFaceDetection) {
      const { x, y, width, height } = datasetFaceDetection.detection.box;
      renderFace(datasetRef.current, x, y, width, height);
    }

    if (selfieFaceDetection) {
      const { x, y, width, height } = selfieFaceDetection.detection.box;
      renderFace(selfieRef.current, x, y, width, height);
    }

    if (datasetFaceDetection && selfieFaceDetection) {
      setChecked(true);
      const distance = faceapi.euclideanDistance(datasetFaceDetection.descriptor, selfieFaceDetection.descriptor);
      console.log(distance)
      if (distance < 0.6) {
        setIsMatched(true);
        setMarkedModal(true);
        await markAttendance();
      } else {
        setIsMatched(false);
        setMarkedModal(true);
      }
    }
  };

  const markAttendance = async () => {
    const type = queryParams.get("type");
    const docID = queryParams.get("docID");
    const today = moment();
    const collectionName = type === "IN" ? "in_attendance" : "out_attendance";

    await setDoc(doc(db, collectionName, docID), {
      time_marked: today.format('hh:mmA'),
      isMarked: true,
    }, { merge: true });
  };

  const getUserData = async () => {
    const userID = queryParams.get("userID");
    const type = queryParams.get("type");

    const today = moment();
    const collectionName = type === "IN" ? "in_attendance" : "out_attendance";
    const [datasetSnapshot, selfieSnapshot] = await Promise.all([
      getDocs(query(collection(db, "users"), where("userID", "==", userID))),
      getDocs(query(collection(db, collectionName), where("userID", "==", userID), where("date_marked", "==", today.format('Do MMMM, YYYY'))))
    ]);

    const datasetData = datasetSnapshot.docs[0]?.data();
    const selfieData = selfieSnapshot.docs[0]?.data();

    setDatasetImage(datasetData?.dataset);
    setSelfieImage(selfieData?.selfie_url);
    setLoaderModal(false);
  };

  useEffect(() => {
    (async () => {
      await getUserData();
      await loadModels();
      await detectFaces();
    })();
  }, []);

  return (
    <div className='main'>
      <Modal show={loaderModal} backdrop="static" keyboard={false} centered size="md" className="transaprentModal">
        <ModalBody>
          <center>
            <img className='loader' src={require('./images/loader.gif')} alt="Loader" />
          </center>
        </ModalBody>
      </Modal>
      <Modal show={markedModal} backdrop="static" keyboard={false} centered size="md" className="transaprentModal">
        <ModalBody>
          <center>
            {isMatched ? (
              <>
                <Lottie options={defaultOptions(checkMark)} style={animationStyles('300px', '300px')} />
                <p className='attendance_marked'>Attendance Marked</p>
              </>
            ) : (
              <>
                <Lottie options={defaultOptions(wrong)} style={animationStyles('200px', '200px')} />
                <p className='attendance_marked_2'>Face does not match</p>
              </>
            )}
          </center>
        </ModalBody>
      </Modal>
      <center>
        <img src={require("./images/banner.png")} className='bannerImg' />
      </center>
      <div className='whiteBG'>
        <p className='infoTitle'>Face Recognition ATS</p>
        <div className="main-container">
          <Row className='isLayoutShown'>
            <Col md={6} sm={6} xs={6}>
              <div className="gallery">
                <center><p className='headerTxt'>Selfie</p></center>
                <img ref={selfieRef} src={selfieImage} alt="Selfie" height="auto" crossOrigin='anonymous' />
              </div>
            </Col>
            <Col md={6} sm={6} xs={6}>
              <div className="gallery">
                <center><p className='headerTxt'>Dataset</p></center>
                <img ref={datasetRef} src={datasetImage} alt="ID card" height="auto" crossOrigin='anonymous' />
              </div>
            </Col>
          </Row>
          <center>
            {
              markedModal ? 
              <img ref={selfieRef} src={selfieImage} alt="Selfie" height="auto" crossOrigin='anonymous' className='selfieImage' />
              :
              <img className='loader' src={require('./images/loader.gif')} alt="Loader" />
            }
          </center>
        </div>
        <br clear="all" />
        <center>
          <div className='faces_info' style={{ backgroundColor: isChecked ? (isMatched ? "#2bc48a" : "#fb1752") : "#000" }}>
            <p>{isChecked ? (isMatched ? "Faces are matched" : "Faces does not match") : "Processing Image"}</p>
          </div>
          {!isChecked && (
            <div className='faces_info_reload' onClick={() => window.location.reload()} style={{ backgroundColor: "#fff" }}>
              <p>Stuck? Reload</p>
            </div>
          )}
        </center>
      </div>
    </div>
  );
}

export default App;
