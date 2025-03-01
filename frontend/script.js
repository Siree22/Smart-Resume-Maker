document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("resumeForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        // Get form values
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const education = document.getElementById("education").value.trim();
        const experience = document.getElementById("experience").value.trim();
        const github = document.getElementById("github").value.trim();
        const linkedin = document.getElementById("linkedin").value.trim();
        const skillsInput = document.getElementById("skills").value.trim();

        if (!name || !email || !education || !skillsInput) {
            alert("Please fill in all required fields (Name, Email, Education, Skills).");
            return;
        }

        const resumeData = {
            name,
            email,
            education,
            experience,
            github,
            linkedin,
            skills: skillsInput.split(",").map(skill => skill.trim())
        };

        try {
            const response = await fetch("http://localhost:5000/generate-resume", { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resumeData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Create a link to download the PDF
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = "SmartResume.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            alert("📄 Resume PDF downloaded!");

        } catch (error) {
            console.error("🚨 Error:", error);
            alert("Failed to generate resume. Please try again.");
        }
    });
});
