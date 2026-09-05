using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Models;

namespace TravelAssistant.Data;

/// <summary>
/// The application's unit of work for PostgreSQL. Entity Framework uses this class to translate
/// the model classes and relationships below into database tables and constraints.
/// </summary>
public class TravelAssistantDbContext(DbContextOptions<TravelAssistantDbContext> options)
    : IdentityUserContext<User, Guid>(options), IDataProtectionKeyContext
{
    // Each DbSet represents a queryable table and the collection used to add or remove its rows.
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<PlannedCost> PlannedCosts => Set<PlannedCost>();
    public DbSet<ItineraryItem> ItineraryItems => Set<ItineraryItem>();
    public DbSet<PackingItem> PackingItems => Set<PackingItem>();
    public DbSet<TodoItem> TodoItems => Set<TodoItem>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // These database rules mirror the validation layer and protect data even if an API client
        // bypasses the frontend.
        modelBuilder.Entity<Trip>(trip =>
        {
            trip.HasOne(item => item.User)
                .WithMany(user => user.Trips)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            trip.Property(item => item.Name).HasMaxLength(150).IsRequired();
            trip.Property(item => item.Destination).HasMaxLength(200);
            trip.Property(item => item.Type).HasConversion<string>().HasMaxLength(30);
            trip.Property(item => item.Budget).HasPrecision(12, 2);
            trip.Property(item => item.Currency).HasMaxLength(3).IsRequired();
            trip.Property(item => item.Note).HasMaxLength(1000);
            trip.Property(item => item.HasStartedPackingList).HasDefaultValue(false);
            trip.Property(item => item.HasStartedTodoList).HasDefaultValue(false);
            trip.Property(item => item.HasPendingTodoDeadlineReview).HasDefaultValue(false);
        });

        modelBuilder.Entity<User>(user =>
        {
            user.Property(item => item.DisplayName).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<Expense>(expense =>
        {
            expense.Property(item => item.Name).HasMaxLength(150).IsRequired();
            expense.Property(item => item.Category).HasConversion<string>().HasMaxLength(30);
            expense.Property(item => item.Amount).HasPrecision(12, 2);
            // An actual expense can represent at most one planned cost.
            expense.HasIndex(item => item.PlannedCostId).IsUnique();
            expense.HasOne(item => item.Trip)
                .WithMany(trip => trip.Expenses)
                .HasForeignKey(item => item.TripId)
                .OnDelete(DeleteBehavior.Cascade); // Deleting a trip removes its child records.
            expense.HasOne(item => item.PlannedCost)
                .WithOne(cost => cost.Expense)
                .HasForeignKey<Expense>(item => item.PlannedCostId)
                .OnDelete(DeleteBehavior.SetNull); // Keep an expense if its linked plan is removed.
        });

        modelBuilder.Entity<PlannedCost>(plannedCost =>
        {
            plannedCost.Property(item => item.Name).HasMaxLength(150).IsRequired();
            plannedCost.Property(item => item.Category).HasConversion<string>().HasMaxLength(30);
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

        modelBuilder.Entity<PackingItem>(packingItem =>
        {
            // Database-level guard for data written outside the normal request validation flow.
            packingItem.ToTable(item => item.HasCheckConstraint(
                "CK_PackingItems_Quantity_Positive",
                "\"Quantity\" > 0"));
            packingItem.Property(item => item.Name).HasMaxLength(150).IsRequired();
            packingItem.Property(item => item.Category).HasConversion<string>().HasMaxLength(30);
            packingItem.Property(item => item.Quantity).HasDefaultValue(1);
            packingItem.Property(item => item.IsPacked).HasDefaultValue(false);
            packingItem.Property(item => item.SortOrder).HasDefaultValue(0);
            packingItem.HasOne(item => item.Trip)
                .WithMany(trip => trip.PackingItems)
                .HasForeignKey(item => item.TripId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TodoItem>(todoItem =>
        {
            todoItem.Property(item => item.Name).HasMaxLength(150).IsRequired();
            todoItem.Property(item => item.Category).HasConversion<string>().HasMaxLength(30);
            todoItem.Property(item => item.IsCompleted).HasDefaultValue(false);
            todoItem.Property(item => item.SortOrder).HasDefaultValue(0);
            todoItem.HasOne(item => item.Trip)
                .WithMany(trip => trip.TodoItems)
                .HasForeignKey(item => item.TripId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
