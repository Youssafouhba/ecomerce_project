# Use an official Java runtime as a parent image
FROM openjdk:17-jdk-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Package the application
RUN chmod +x ./mvnw
RUN ./mvnw clean package

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "target/authentification-0.0.1-SNAPSHOT.jar"]

