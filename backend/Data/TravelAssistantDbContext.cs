using Microsoft.EntityFrameworkCore;
using TravelAssistant.Models;

namespace TravelAssistant.Data;

public class TravelAssistantDbContext(DbContextOptions<TravelAssistantDbContext> options)
    : DbContext(options)
{
    public DbSet<Trip> Trips => Set<Trip>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Trip>(trip =>
        {
            trip.Property(item => item.Destination)
                .HasMaxLength(200)
                .IsRequired();

            trip.Property(item => item.Type)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            trip.Property(item => item.Budget)
                .HasPrecision(12, 2);

            trip.Property(item => item.Currency)
                .HasMaxLength(3)
                .IsRequired();
        });
    }
}
