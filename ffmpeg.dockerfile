FROM amazonlinux:latest

RUN yum install -y \
    gcc \
    gcc-c++ \
    libtool \
    autoconf \
    automake \
    make \
    nasm \
    pkgconfig \
    zlib-devel \
    git \
    curl \
    tar
COPY nasm.repo /etc/yum.repos.d/
RUN yum update -y

ENV CFLAGS '-flto -ffat-lto-objects -Ofast'
ENV CXXFLAGS "$CFLAGS"
ENV LDFLAGS '-flto=8'

RUN git clone --depth 1 git://git.videolan.org/x264
RUN cd x264 && \
    ./configure \
        --enable-static \
        --disable-opencl \
        --enable-lto \
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
        --enable-lto \
        --enable-avcodec \
        --enable-avformat \
        --enable-avfilter \
        --enable-swresample \
        --enable-swscale \
        --enable-filter=scale \
        --enable-demuxer=rawvideo \
        --enable-demuxer=image2pipe \
        --enable-decoder=rawvideo \
        --enable-encoder=libx264 \
        --enable-protocol=pipe \
        --enable-protocol=file \
        --enable-gpl \
        --enable-libx264 \
        --enable-muxer=mp4 \
    && \
    make -j
