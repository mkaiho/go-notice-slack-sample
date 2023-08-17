FROM gcr.io/distroless/base-debian11
COPY ./_deployments/bin /home/app/bin
WORKDIR /home/app/bin