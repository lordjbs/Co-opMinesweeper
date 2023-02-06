FROM mcr.microsoft.com/dotnet/sdk:7.0.102-alpine3.17-amd64 AS build-env
WORKDIR /CoopMinesweeper

COPY . ./
RUN dotnet restore
RUN dotnet publish -c Release -o /CoopMinesweeper/publish

FROM mcr.microsoft.com/dotnet/aspnet
WORKDIR /CoopMinesweeper
COPY --from=build-env /CoopMinesweeper/publish .
ENTRYPOINT ["dotnet", "CoopMinesweeper.dll"]