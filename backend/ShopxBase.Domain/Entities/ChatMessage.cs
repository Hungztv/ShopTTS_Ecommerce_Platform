using System.ComponentModel.DataAnnotations.Schema;

namespace ShopxBase.Domain.Entities;

public class ChatMessage : BaseEntity
{
    public int SessionId { get; set; }
    
    public string SenderId { get; set; } = null!;
    
    public string Content { get; set; } = null!;
    
    public string? AttachmentUrl { get; set; }
    
    public bool IsRead { get; set; } = false;

    [ForeignKey(nameof(SessionId))]
    public virtual ChatSession Session { get; set; } = null!;

    [ForeignKey(nameof(SenderId))]
    public virtual AppUser Sender { get; set; } = null!;
}
