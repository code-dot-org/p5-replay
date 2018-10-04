FROM lambci/lambda:build

RUN curl https://nasm.us/nasm.repo -o /etc/yum.repos.d/nasm.repo && \
    yum install -y nasm

RUN git clone --depth 1 git://git.videolan.org/x264
RUN cd x264 && \
    ./configure \
        --enable-static \
        --disable-opencl \
    && \
    make -j && \
    make install

RUN git clone --depth 1 git://source.ffmpeg.org/ffmpeg
RUN cd ffmpeg && \
    mkdir build && \
    cd build && \
    ../configure \
        --disable-all \
        --enable-ffmpeg \
        --enable-avcodec \
        --enable-avformat \
        --enable-avfilter \
        --enable-swresample \
        --enable-swscale \
        --enable-encoder=libx264 \
        --enable-protocol=pipe \
        --enable-muxer=mp4 \
        --enable-filter=scale \
        --enable-gpl \
        --enable-libx264 \
    && \
    make -j
VOLUME /build
