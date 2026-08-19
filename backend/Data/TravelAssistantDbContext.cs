using Microsoft.EntityFrameworkCore;
using TravelAssistant.Models;

namespace TravelAssistant.Data;

public class TravelAssistantDbContext(DbContextOptions<TravelAssistantDbContext> options) : DbContext(options)
{
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<BudgetItem> BudgetItems => Set<BudgetItem>();
    public DbSet<PlannedCost> PlannedCosts => Set<PlannedCost>();
    public DbSet<ItineraryItem> ItineraryItems => Set<ItineraryItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Trip>(trip =>
        {
            trip.Property(item => item.Name).HasMaxLength(150).IsRequired();
            trip.Property(item => item.Destination).HasMaxLength(200);
            trip.Property(item => item.Type).HasConversion<string>().HasMaxLength(30);
            trip.Property(item => item.Budget).HasPrecision(12, 2);
            trip.Property(item => item.Currency).HasMaxLength(3).IsRequired();
            trip.Property(item => item.Note).HasMaxLength(1000);
        });

        modelBuilder.Entity<BudgetItem>(budgetItem =>
        {
            budgetItem.Property(item => item.Name).HasMaxLength(150).IsRequired();
            budgetItem.Property(item => item.Category).HasConversion<string>().HasMaxLength(30).IsRequired();
            budgetItem.Property(item => item.Amount).HasPrecision(12, 2);
            budgetItem.HasOne(item => item.Trip)
                .WithMany(trip => trip.BudgetItems)
                .HasForeignKey(item => item.TripId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PlannedCost>(plannedCost =>
        {
            plannedCost.Property(item => item.Name).HasMaxLength(150).IsRequired();
            plannedCost.Property(item => item.Category).HasConversion<string>().HasMaxLength(30).IsRequired();
            plannedCost.Property(item => item.Amount).HasPrecision(12, 2);
            plannedCost.HasOne(item => item.Trip)
                .WithMany(trip => trip.PlannedCosts)
                .HasForeignKey(item => item.TripId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ItineraryItem>(itineraryItem =>
        {
            itineraryItem.Property(item => item.Name).HasMaxLength(150).IsRequired();
            itineraryItem.Property(item => item.Category).HasConversion<string>().HasMaxLength(30);
            itineraryItem.Property(item => item.Cost).HasPrecision(12, 2);
            itineraryItem.Property(item => item.Location).HasMaxLength(300);
            itineraryItem.Property(item => item.ExternalLink).HasMaxLength(2000);
            itineraryItem.Property(item => item.Priority).HasConversion<string>().HasMaxLength(30).IsRequired();
            itineraryItem.Property(item => item.Note).HasMaxLength(1000);
            itineraryItem.HasOne(item => item.Trip)
                .WithMany(trip => trip.ItineraryItems)
                .HasForeignKey(item => item.TripId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
