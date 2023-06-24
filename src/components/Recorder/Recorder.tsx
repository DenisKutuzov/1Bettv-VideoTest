import {useState} from "react";

import {useReactMediaRecorder} from "react-media-recorder";
import {saveAs} from 'file-saver';
import {createFFmpeg, fetchFile} from '@ffmpeg/ffmpeg';
import Webcam from "react-webcam";
import ReactPlayer from 'react-player'

import './recorder.css'


const Recorder = () => {

    const ffmpeg = createFFmpeg({log: true});

    const videoPath = '/videos/video.mp4';


    const [strLoad, setStrLoad] = useState('')



    function getDuration(blob: Blob): Promise<number> {
        return new Promise((resolve, reject) => {
            const audioContext = new AudioContext();
            const fileReader = new FileReader();
            fileReader.onload = () => {
                const arrayBuffer = fileReader.result as ArrayBuffer;
                audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
                    const durationInSeconds = audioBuffer.duration;
                    resolve(durationInSeconds);
                }, reject);
            };
            fileReader.onerror = reject;
            fileReader.readAsArrayBuffer(blob);
        });
    }


    const trimVideo = async (file: File, startTime: number, endTime: number): Promise<Blob> => {

        if (!ffmpeg.isLoaded()) {
            ffmpeg.load();
        }

        setStrLoad('Загружеам файл в память')
        // Загрузите ffmpeg.js

        // Загрузите видеофайл в память
        ffmpeg.FS('writeFile', file.name, await fetchFile(file));

        setStrLoad('Обрезаем видео ждите')
        // Обрежьте видео
        await ffmpeg.run('-ss', startTime.toString(), '-i', file.name, '-to', endTime.toString(), '-t', (endTime - startTime).toString(), 'output.mp4');

        setStrLoad('Прочитываем обрезанное видео из памяти')
        // Прочитайте обрезанное видео из памяти
        const data = ffmpeg.FS('readFile', 'output.mp4');

        // Создайте объект Blob с обрезанным видео
        const trimmedVideo = new Blob([data.buffer], {type: 'video/mp4'});
        setStrLoad('')
        return trimmedVideo;
    };

    const {status, startRecording, stopRecording,} =
        useReactMediaRecorder({
            screen: true, blobPropertyBag: {type: "video/mp4"}, onStop: (blobUrl, blob) => {

                const saveRecordFun = async () => {

                    const duration = await getDuration(blob);
                    console.log(`Длительность медиа-файла: ${duration} секунд`);


                    if (duration > 300) {

                        const file = new File([blob], 'trimmed-video.mp4', {type: 'video/mp4'});
                        const trimmedVideo = await trimVideo(file, duration - 300, duration);
                        const url = URL.createObjectURL(trimmedVideo)
                        saveAs(url)
                    } else {

                        saveAs(blobUrl)
                    }
                }

                saveRecordFun()
            }
        });


    console.log(status)


    return <>
        {strLoad && <h1 className={'loaderText'}>{strLoad}</h1>}
        <ReactPlayer
            width="100%"
            height="100%"
            url={process.env.PUBLIC_URL + videoPath}
            controls
            loop/>
        <div className={'webCamera'}>
            <Webcam mirrored={true}/>
        </div>
        <div>
            {status === 'recording' ? <button className={'btnStop'} onClick={stopRecording}>REC</button> :
                <button className={'btnStart'} disabled={!!strLoad} onClick={startRecording}>REC</button>}
        </div>
    </>
}
export default Recorder