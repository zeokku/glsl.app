FROM amazoncorretto:17.0.7

WORKDIR /app

COPY . .

RUN ./gradlew build --no-daemon

CMD [ "java", "-jar", "/app/build/libs/backend-0.0.1-SNAPSHOT.jar" ]
