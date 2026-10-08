# Builds the .NET API, then puts only the published app in a smaller runtime
# image. Render runs that image, where the API listens on port 8080.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY TravelAssistant.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish TravelAssistant.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TravelAssistant.dll"]
