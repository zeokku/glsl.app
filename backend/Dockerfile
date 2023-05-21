FROM amazoncorretto:17.0.7

WORKDIR /app

COPY . .

RUN chmod +x ./gradlew

RUN ./gradlew build -x test --no-daemon

CMD [ "java", "-jar", "/app/build/libs/Backend-0.0.1-SNAPSHOT.jar" ]
