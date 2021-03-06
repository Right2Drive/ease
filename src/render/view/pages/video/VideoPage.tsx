import { ResizeSensor } from "css-element-queries";
import { clipboard, ipcRenderer } from "electron";
import * as React from "react";

import { MainChannel } from "../../../../constants/Channels";
import { createMinimumSizeMessage, createResizeMessage } from "../../../../ipc-common/messages/WindowMessage";
import { setPlayStatusAction, setVideoReadyAction } from "../../../actions/VideoActions";
import "../../../style/video.less";
import { UserType } from "../../../utils/Definitions";

export interface IVideoInputProps {

}

export interface IVideoStoreProps {
    readonly id: string;
    readonly videoReady: boolean;
    readonly fullscreen: boolean;
    readonly play: boolean;
}

export interface IVideoDispatchProps {
    readonly setVideoReadyDispatch: setVideoReadyAction;
    readonly setPlayStatusDispatch: setPlayStatusAction;
}

export interface IVideoState {
    time: number;
    volume: number;
    muted: boolean;
    duration: number;
    showVideo: boolean;
    showControls: boolean;
}

export type IVideoProps = IVideoInputProps & IVideoStoreProps & IVideoDispatchProps;

export abstract class VideoPage<P extends IVideoProps> extends React.Component<P, IVideoState> {
    /** Timeout to hide controls and cursor */
    private static readonly SHOW_CONTROLS_TIME = 3500;
    /** Height of the toolbar in pixels */
    private static readonly TOOLBAR_HEIGHT = 30;
    protected video: HTMLVideoElement;
    protected videoWrapper: HTMLDivElement;
    protected timer: number;
    protected type: UserType;
    protected resizeSensor: ResizeSensor;

    constructor(props, showVideo: boolean) {
        super(props);

        this.state = {
            time: 0,
            volume: 100,
            muted: false,
            duration: 100,
            showControls: true,
            showVideo,
        };

        // Bindings
        this.resizePageToVideo = this.resizePageToVideo.bind(this);

        this.type = UserType.PENDING;
    }

    /************************ Methods ************************/

    protected setTime = (time: number) => {
        let check = time;
        if (check > this.state.duration) {
            check = this.state.duration;
        }
        else if (check < 0) {
            check = 0;
        }
        this.setState({
            time: check,
        });
    }

    protected setVolume = (volume: number) => {
        let check = volume;
        if (check > 100) {
            check = 100;
        }
        else if (check < 0) {
            check = 0;
        }
        this.setState({
            volume: check,
            muted: false,
        });
        this.updateVideoVolume(check, false);
    }

    protected toggleFullscreen = () => {
        if (document.webkitIsFullScreen) {
            const listener = () => {
                window.removeEventListener("resize", listener);
                this.resizePageToVideo();
            };
            window.addEventListener("resize", listener);
            document.webkitExitFullscreen();
        } else {
            this.videoWrapper.webkitRequestFullscreen();
        }
    }

    protected setVideo = (video: HTMLVideoElement) => {
        this.video = video;
    }

    protected setVideoWrapper = (videoWrapper: HTMLDivElement) => {
        this.videoWrapper = videoWrapper;
    }

    protected toggleVolume = () => {
        this.setState({
            muted: !this.state.muted,
        });
        this.updateVideoVolume(undefined, !this.state.muted);
    }

    protected onMouseMove = () => {
        this.showControls();
        if (this.timer) {
            window.clearTimeout(this.timer);
        }
        this.timer = window.setTimeout(this.hideControls, VideoPage.SHOW_CONTROLS_TIME);
    }

    protected copyClick = () => {
        clipboard.writeText(this.props.id);
    }

    protected updateVideoVolume(volume?: number, muted?: boolean) {
        if (volume === undefined) {
            volume = this.state.volume;
        }
        if (muted === undefined) {
            muted = this.state.muted;
        }
        this.video.volume = muted ? 0 : (volume / 100);
    }

    protected onVideoWheel = (event: React.WheelEvent<HTMLVideoElement>) => {
        const newVolume = this.state.volume + ((event.deltaY > 0) ? -5 : 5);
        this.setVolume(newVolume);
    }

    protected resizePageToVideo(): void {
        const height = this.calculatePageHeight(this.getVideoHeight());
        ipcRenderer.send(MainChannel.windowMainChannel, createResizeMessage(-1, height));
        ipcRenderer.send(MainChannel.windowMainChannel, createMinimumSizeMessage(0, height));
    }

    protected watchVideoSize(): void {
        if (this.resizeSensor) {
            this.resizeSensor.detach(this.videoWrapper, this.resizePageToVideo);
        }
        this.resizeSensor = new ResizeSensor(this.videoWrapper, this.resizePageToVideo);
    }

    private showControls = () => {
        this.setState({
            showControls: true,
        });
    }

    private hideControls = () => {
        this.setState({
            showControls: false,
        });
    }

    private calculatePageHeight(videoHeight: number) {
        return videoHeight + VideoPage.TOOLBAR_HEIGHT;
    }

    private getVideoHeight(): number {
        return this.videoWrapper.clientHeight;
    }

    private setupVideoShortcuts = () => {
        window.addEventListener("keydown", (event: KeyboardEvent) => {
            switch (event.keyCode) {
                case 32: // space
                    this.togglePlay();
                    break;

                case 122: // F11
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;

                case 37:
                    event.preventDefault();
                    this.seek(this.state.time - 10);
                    break;

                case 39:
                    this.seek(this.state.time + 10);
                    break;

                default:
            }
        });
    }

    /******************** Abstract Methods *******************/

    protected abstract togglePlay: () => void;
    protected abstract onCastButton: () => void;
    protected abstract seek: (time: number) => void;

    /********************* React Lifecycle *******************/

    protected componentDidMount() {
        this.setupVideoShortcuts();
    }

    public abstract render(): JSX.Element;
}
