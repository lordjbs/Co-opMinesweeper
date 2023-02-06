using Microsoft.Data.Sqlite;
using System;
using System.Linq;
using Microsoft.Extensions.Configuration;

public class Database
{
    private readonly string databaseLocation;

    public Database(IConfiguration configuration)
    {
        databaseLocation = configuration["AppSettings:DatabasePath"];
    }
    public void Load()
    {
        using var conn = new SqliteConnection("Data Source="+databaseLocation);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "CREATE TABLE IF NOT EXISTS games (id bigint NOT NULL, game_id character VARYING CHARACTER(6) NOT NULL, host_connection_id VARYING CHARACTER(50) NOT NULL, created_at datetime DEFAULT (datetime('now', 'localtime')));";
        cmd.ExecuteNonQuery();
    }

    public int generateNumericId(int length)
    {
        var random = new Random();
        string s = string.Empty;
        for (int i = 0; i < length; i++)
            s = String.Concat(s, random.Next(10).ToString());
        return Int32.Parse(s);
    }

    public string generateSequence(int length)
    {
        var random = new Random();
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return new string(Enumerable.Repeat(chars, length)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    public int createGame(string hostConnectionId)
    {
        var gameId = generateNumericId(5);
        using var conn = new SqliteConnection("Data Source="+databaseLocation);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "INSERT INTO games VALUES (@a, @b, @c, datetime('now'));";
        cmd.Parameters.AddWithValue("a", gameId);
        cmd.Parameters.AddWithValue("b", gameId.ToString());
        cmd.Parameters.AddWithValue("c", hostConnectionId);

        cmd.ExecuteNonQuery();
        return gameId;
    }
}