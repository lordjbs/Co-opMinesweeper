using Microsoft.Extensions.Configuration;
using Microsoft.Data.Sqlite;
using System;

namespace CoopMinesweeper.Services;

public interface IGameService
{
    string CreateGame(string hostConnectionId);
    string GetHostConnectionId(string gameId);
    void RemoveOldGames();
}

public class GameService : IGameService
{
    private readonly Database database;
    private readonly string databaseLocation;

    public GameService(IConfiguration configuration)
    {
        databaseLocation = configuration["AppSettings:DatabasePath"];
        database = new Database(configuration);
    }

    public string CreateGame(string hostConnectionId)
    {
        return database.createGame(hostConnectionId).ToString();
    }

    public string GetHostConnectionId(string gameId)
    {
        string hostConnectionId;
        using var conn = new SqliteConnection("Data Source="+databaseLocation);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT host_connection_id FROM games AS g WHERE g.game_id = @p;";
        cmd.Parameters.AddWithValue("p", gameId);
        hostConnectionId = (string)cmd.ExecuteScalar();
        Console.WriteLine(hostConnectionId);

        return hostConnectionId;
    }

    public void RemoveOldGames()
    {
        try
        {
            using var conn = new SqliteConnection("Data Source=" + databaseLocation);
            conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM games WHERE created_at < datetime('now', '-300 seconds');";
            cmd.ExecuteNonQuery();
        }
        catch(Exception ex)
        { 
            Console.WriteLine(ex.Message);
        }
    }
}
