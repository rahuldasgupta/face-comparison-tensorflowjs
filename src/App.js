import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Lottie from 'react-lottie';
import Modal from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import {initializeApp} from 'firebase/app';
import moment from "moment";
import { collection, query, where, getDocs, getFirestore, doc, setDoc, addDoc, deleteDoc  } from "firebase/firestore";

import scanning from './images/scanning.json'; 
import check_mark from './images/check-mark.json';
import wrong from './images/wrong.json'; 
import "bootstrap/dist/css/bootstrap.min.css";
import './App.css';

const queryParams =  new URLSearchParams(window.location.search);

const firebaseConfig = {
  apiKey: "AIzaSyCbefli6cZ4SGkrHRBRJ9p_bqxk7rHAxPw",
  authDomain: "peace-channel.firebaseapp.com",
  projectId: "peace-channel",
  storageBucket: "peace-channel.appspot.com",
  messagingSenderId: "326500113628",
  appId: "1:326500113628:web:6f72d082b9d7992fb4a819"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  const [docID, setDocID] = useState(false);

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
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
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
        if(distance<0.6){
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
    let type = queryParams.get("type");
    let doc_ID = queryParams.get("docID");
    const today = moment(); 

    if(type=="IN"){
      const userRef = doc(db, "in_attendance", doc_ID);
      await setDoc(userRef, {
        time_marked: today.format('hh:mmA'),
        isMarked: true,
      }, { merge: true });
    }
    else{
      const userRef = doc(db, "out_attendance", doc_ID);
      await setDoc(userRef, {
        time_marked: today.format('hh:mmA'),
        isMarked: true,
      }, { merge: true });
    }
  }
  const getUserData = async() => {

    let userID = queryParams.get("userID");
    let type = queryParams.get("type");

    var data = {};
    var doc_ID = "";

    const dataset_q = await query(collection(db, "users"), where("userID", "==", userID));
    const dataset_querySnapshot = await getDocs(dataset_q);
    dataset_querySnapshot.forEach((doc) => {
        data = doc.data()
    })
    setDatasetImage(data.dataset)

    const today = moment(); 

    if(type=="IN"){
      const selfie_q =  await query(collection(db, "in_attendance"), where("userID", "==", userID), where("date_marked", "==", today.format('Do MMMM, YYYY')));
      const selfie_querySnapshot = await getDocs(selfie_q);
      selfie_querySnapshot.forEach((doc) => {
          data = doc.data()
          doc_ID = doc.id
      })
      setDocID(doc_ID)
      setSelfieImage(data.selfie_url)
    }
    else{
      const selfie_q =  await query(collection(db, "out_attendance"), where("userID", "==", userID), where("date_marked", "==", today.format('Do MMMM, YYYY')));
      const selfie_querySnapshot = await getDocs(selfie_q);
      selfie_querySnapshot.forEach((doc) => {
          data = doc.data()
          doc_ID = doc.id
      })
      setDocID(doc_ID)
      setSelfieImage(data.selfie_url)
    }
    setLoaderModal(false)
    setTimeout(() => {
      setIsDataLoaded(true)
    }, 400);
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
