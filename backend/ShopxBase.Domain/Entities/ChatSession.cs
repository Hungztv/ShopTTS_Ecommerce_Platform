using System.ComponentModel.DataAnnotations.Schema;

namespace ShopxBase.Domain.Entities;

public class ChatSession : BaseEntity
{
    public string User1Id { get; set; } = null!;
    public string User2Id { get; set; } = null!;
    
    public string? LastMessage { get; set; }
    public DateTime? LastMessageAt { get; set; }

    [ForeignKey(nameof(User1Id))]
    public virtual AppUser User1 { get; set; } = null!;

    [ForeignKey(nameof(User2Id))]
    public virtual AppUser User2 { get; set; } = null!;

    public virtual ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}
